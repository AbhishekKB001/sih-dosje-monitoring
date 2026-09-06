# STUN / TURN & Coturn Configuration Guide

## Why STUN & TURN Are Needed
- **STUN (Session Traversal Utilities for NAT)**: Discovers the client's public IP address and port when behind simple NAT/home routers.
- **TURN (Traversal Using Relays around NAT)**: Relays encrypted media through an intermediate server when symmetric NATs or strict enterprise/government firewalls block direct P2P connections.

---

## Development Mode (STUN Only)
By default, the platform uses Google's public STUN server:
```env
STUN_SERVER_URL=stun:stun.l.google.com:19302
```
This requires zero configuration and works out of the box on consumer networks.

---

## Production Coturn Setup (Docker)
For strict government intranet deployments, run Coturn:

```yaml
# In docker-compose.yml:
coturn:
  image: coturn/coturn:latest
  ports:
    - "3478:3478"
    - "3478:3478/udp"
    - "5349:5349"
    - "49152-49200:49152-49200/udp"
  command:
    - --listening-port=3478
    - --realm=sih-inspection.gov.in
    - --user=sih_turn_user:your_secure_turn_password
    - --lt-cred-mech
```

Configure backend `.env`:
```env
TURN_SERVER_URL=turn:your-coturn-domain.gov.in:3478
TURN_USERNAME=sih_turn_user
TURN_PASSWORD=your_secure_turn_password
```

The backend API (`GET /api/vc/ice-servers`) automatically distributes these credentials to frontend WebRTC clients.
