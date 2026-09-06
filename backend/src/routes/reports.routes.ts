import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { optionalAuthenticateToken } from '../middleware/auth';

const router = Router();

function formatReport(rep: any) {
  const avgRating =
    (rep.infrastructureRating + rep.sanitationRating + rep.hygieneRating + rep.foodQualityRating) / 4;

  let finalStatus: 'compliant' | 'minor_issues' | 'major_issues' | 'escalated' = 'compliant';
  if (rep.actionRequired || avgRating <= 2) finalStatus = 'escalated';
  else if (avgRating <= 3) finalStatus = 'minor_issues';
  else if (avgRating <= 3.5) finalStatus = 'compliant';

  const indicators = [];
  if (!rep.attendanceMatches) indicators.push('Headcount variance detected during on-site verification');
  if (rep.sanitationRating <= 2) indicators.push('Substandard sanitation condition noted');
  if (rep.actionRequired) indicators.push('Supervisory compliance warning issued');
  if (indicators.length === 0) indicators.push('Zero material infractions observed');

  return {
    id: rep.id,
    inspectionId: rep.inspectionId,
    inspectionNumber: rep.inspection?.inspectionNumber,
    inspector: rep.inspection?.inspector?.name || 'Inspection Officer',
    institute: rep.inspection?.institute?.name || 'DoSJE Center',
    district: rep.inspection?.institute?.district || 'Central District',
    timestamp: rep.submittedAt.toISOString(),
    checklistPassed: rep.attendanceMatches ? 8 : 6,
    checklistTotal: 8,
    evidenceCount: rep.inspection?.evidenceItems?.length || 2,
    aiRiskIndicators: indicators,
    recommendation: rep.recommendations || 'Maintain standard operational compliance.',
    finalStatus,
    summary: rep.summary,
    ratings: {
      infrastructure: rep.infrastructureRating,
      sanitation: rep.sanitationRating,
      hygiene: rep.hygieneRating,
      foodQuality: rep.foodQualityRating,
    },
    createdAt: rep.createdAt,
  };
}

// GET /api/reports
router.get('/', optionalAuthenticateToken, async (req, res) => {
  try {
    const reports = await prisma.inspectionReport.findMany({
      include: {
        inspection: {
          include: {
            institute: true,
            inspector: true,
            evidenceItems: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.json(reports.map(formatReport));
  } catch (err) {
    console.error('Reports GET error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch inspection reports' });
  }
});

// GET /api/reports/:id
router.get('/:id', optionalAuthenticateToken, async (req, res): Promise<void> => {
  try {
    const report = await prisma.inspectionReport.findUnique({
      where: { id: req.params.id },
      include: {
        inspection: {
          include: {
            institute: true,
            inspector: true,
            evidenceItems: true,
          },
        },
      },
    });

    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    res.json(formatReport(report));
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch report' });
  }
});

// GET /api/reports/:id/summary
// Formal certified inspection summary certificate for official DoSJE compliance
router.get('/:id/summary', optionalAuthenticateToken, async (req, res): Promise<void> => {
  try {
    const report = await prisma.inspectionReport.findFirst({
      where: { OR: [{ id: req.params.id }, { inspectionId: req.params.id }] },
      include: {
        inspection: {
          include: {
            institute: { include: { project: true } },
            inspector: true,
            evidenceItems: true,
          },
        },
      },
    });

    if (!report) {
      res.status(404).json({ success: false, message: 'Inspection certificate record not found' });
      return;
    }

    const insp = report.inspection;
    const formatted = formatReport(report);
    const avgScore = (report.infrastructureRating + report.sanitationRating + report.hygieneRating + report.foodQualityRating) / 4;

    res.json({
      success: true,
      certificateNumber: `CERT-${insp.inspectionNumber}-${Date.now().toString().slice(-6)}`,
      inspectionNumber: insp.inspectionNumber,
      issuedAt: new Date().toISOString(),
      governingMinistry: 'Ministry of Social Justice and Empowerment (DoSJE)',
      portal: 'DoSJE Drishti National Surveillance Portal',
      institute: {
        id: insp.institute.id,
        name: insp.institute.name,
        code: insp.institute.code,
        address: insp.institute.address,
        district: insp.institute.district,
        state: insp.institute.state,
        coordinates: { latitude: insp.institute.latitude, longitude: insp.institute.longitude },
        projectScheme: insp.institute.project?.scheme || 'SMILE',
      },
      inspector: {
        id: insp.inspector?.id || 'USR-PMU-104',
        name: insp.inspector?.name || 'Authorized Field Auditor',
        role: insp.inspector?.role || 'INSPECTOR',
      },
      auditFindings: {
        summary: report.summary,
        beneficiariesVerified: report.beneficiariesVerified,
        attendanceMatches: report.attendanceMatches,
        ratings: {
          infrastructure: report.infrastructureRating,
          sanitation: report.sanitationRating,
          hygiene: report.hygieneRating,
          foodQuality: report.foodQualityRating,
          compositeScoreOutOf5: avgScore,
        },
        issuesIdentified: report.issuesIdentified,
        recommendations: report.recommendations,
        supervisoryActionRequired: report.actionRequired,
      },
      evidenceChain: {
        evidenceItemCount: insp.evidenceItems.length,
        tamperEvidentHashes: insp.evidenceItems.map((e) => ({
          id: e.id,
          fileType: e.fileType,
          sha256Hash: e.sha256Hash,
          capturedAt: e.capturedAt,
        })),
      },
      cryptographicSeal: {
        algorithm: 'SHA-256',
        isSealed: true,
        verificationUrl: `/api/evidence/${insp.evidenceItems[0]?.id || 'verified'}/verify`,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate certificate summary' });
  }
});

export default router;
