# Random Video Conferencing (VC) & Inspection Verification

## Problem Statement
During institutional inspections, physical presence of key personnel (Project In-Charge, Field Staff, Beneficiaries) must be independently audited to prevent ghost beneficiaries and forged attendance reports.

---

## Server-Side Random Selection Workflow

```
[Inspector Dashboard]
        │
        ▼ (POST /api/vc/sessions/random)
[RandomParticipantService]
        │
        ├─ 1. Query Project Users matching Eligible Roles (In-Charge, Staff, Beneficiary)
        ├─ 2. Filter out inactive / unavailable users (isAvailable: true)
        ├─ 3. Cryptographically random pick index
        ├─ 4. Generate unique room: inspection-room-<uuid>
        ├─ 5. Insert VideoCallSession record with status: REQUESTED
        │
        ▼
[WebRTC Call Screen]
        │
        ▼ (Inspector & Selected Participant Connect)
[Inspection Verification Form]
        │
        ├─ Verdict: VERIFIED or NOT_VERIFIED
        └─ Remarks: Timestamp, inspector observation notes
        │
        ▼ (POST /api/vc/sessions/:id/result)
[Prisma Database Audit Log]
```

---

## Data Model Reference

```prisma
model VideoCallSession {
  id                    String             @id @default(uuid())
  inspectionId          String
  inspection            Inspection         @relation(fields: [inspectionId], references: [id])
  initiatedById         String
  initiatedBy           User               @relation("CallInitiator", fields: [initiatedById], references: [id])
  selectedParticipantId String
  selectedParticipant   User               @relation("CallParticipant", fields: [selectedParticipantId], references: [id])
  participantRole       Role
  roomId                String             @unique
  status                CallStatus         @default(REQUESTED)
  result                VerificationResult @default(PENDING)
  notes                 String?
  startedAt             DateTime           @default(now())
  connectedAt           DateTime?
  endedAt               DateTime?
}
```

---

## Key Security & Audit Controls
1. **Selection on Backend**: The selection is calculated exclusively on the server to prevent browser-side tampering or cherry-picking of participants.
2. **Audit Trail**: Every initiation, connection timestamp, duration, verification outcome, and inspector note is permanently persisted.
3. **Availability Filter**: Users flagged `isAvailable: false` are excluded from the pool to avoid calling absent staff.
