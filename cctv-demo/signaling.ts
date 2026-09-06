import { Server as SocketIOServer, Socket } from 'socket.io';
import { VcService } from './vc.service.js';

interface RoomParticipant {
    socketId: string;
    userId: string;
    userName: string;
    role: string;
}

export class SignalingServer {
    private io: SocketIOServer;
    // Map of roomId -> Array of active participants
    private rooms: Map<string, RoomParticipant[]> = new Map();

    constructor(io: SocketIOServer) {
        this.io = io;
        this.init();
    }

    private init() {
        this.io.on('connection', (socket: Socket) => {
            console.log(`[Signaling] Socket connected: ${socket.id}`);

            // 1. Join Room
            socket.on('join-room', async (data: { roomId: string; userId: string; userName: string; role: string }) => {
                const { roomId, userId, userName, role } = data;
                if (!roomId || !userId) return;

                socket.join(roomId);

                const currentParticipants = this.rooms.get(roomId) || [];
                // Prevent duplicate socket registrations
                const updatedParticipants = currentParticipants.filter((p) => p.socketId !== socket.id);
                const newParticipant: RoomParticipant = { socketId: socket.id, userId, userName, role };
                updatedParticipants.push(newParticipant);
                this.rooms.set(roomId, updatedParticipants);

                console.log(`[Signaling] User ${userName} (${role}) joined room: ${roomId}`);

                // Notify other room members
                socket.to(roomId).emit('participant-joined', {
                    socketId: socket.id,
                    userId,
                    userName,
                    role,
                    totalParticipants: updatedParticipants.length,
                });

                // Send current participants list to the joining member
                socket.emit('room-state', {
                    roomId,
                    participants: updatedParticipants,
                });
            });

            // 2. Call Request (Inspector calling selected participant)
            socket.on('call-request', (data: { roomId: string; caller: { id: string; name: string; role: string } }) => {
                console.log(`[Signaling] Call request in room: ${data.roomId} from ${data.caller?.name}`);
                socket.to(data.roomId).emit('incoming-call', {
                    roomId: data.roomId,
                    caller: data.caller,
                });
            });

            // 3. Call Accepted
            socket.on('call-accepted', async (data: { roomId: string; sessionId?: string }) => {
                console.log(`[Signaling] Call accepted in room: ${data.roomId}`);
                socket.to(data.roomId).emit('call-accepted', { roomId: data.roomId });

                if (data.sessionId) {
                    await VcService.updateSessionStatus(data.sessionId, 'ACCEPTED').catch(() => { });
                }
            });

            // 4. Call Rejected
            socket.on('call-rejected', async (data: { roomId: string; sessionId?: string; reason?: string }) => {
                console.log(`[Signaling] Call rejected in room: ${data.roomId}`);
                socket.to(data.roomId).emit('call-rejected', {
                    roomId: data.roomId,
                    reason: data.reason || 'Participant rejected call',
                });

                if (data.sessionId) {
                    await VcService.updateSessionStatus(data.sessionId, 'REJECTED').catch(() => { });
                }
            });

            // 5. WebRTC Offer
            socket.on('offer', (data: { roomId: string; sdp: any }) => {
                console.log(`[Signaling] Relay offer in room: ${data.roomId}`);
                socket.to(data.roomId).emit('offer', {
                    from: socket.id,
                    sdp: data.sdp,
                });
            });

            // 6. WebRTC Answer
            socket.on('answer', (data: { roomId: string; sdp: any }) => {
                console.log(`[Signaling] Relay answer in room: ${data.roomId}`);
                socket.to(data.roomId).emit('answer', {
                    from: socket.id,
                    sdp: data.sdp,
                });
            });

            // 7. ICE Candidate
            socket.on('ice-candidate', (data: { roomId: string; candidate: any }) => {
                socket.to(data.roomId).emit('ice-candidate', {
                    from: socket.id,
                    candidate: data.candidate,
                });
            });

            // 8. End Call
            socket.on('end-call', async (data: { roomId: string; sessionId?: string }) => {
                console.log(`[Signaling] Call ended in room: ${data.roomId}`);
                socket.to(data.roomId).emit('call-ended', { roomId: data.roomId });

                if (data.sessionId) {
                    await VcService.updateSessionStatus(data.sessionId, 'ENDED').catch(() => { });
                }
            });

            // 9. Disconnect Cleanup
            socket.on('disconnect', () => {
                console.log(`[Signaling] Socket disconnected: ${socket.id}`);

                // Find which room this socket belonged to
                for (const [roomId, participants] of this.rooms.entries()) {
                    const leaving = participants.find((p) => p.socketId === socket.id);
                    if (leaving) {
                        const filtered = participants.filter((p) => p.socketId !== socket.id);
                        if (filtered.length > 0) {
                            this.rooms.set(roomId, filtered);
                        } else {
                            this.rooms.delete(roomId);
                        }

                        socket.to(roomId).emit('participant-left', {
                            socketId: socket.id,
                            userId: leaving.userId,
                            userName: leaving.userName,
                        });

                        console.log(`[Signaling] User ${leaving.userName} left room ${roomId}`);
                    }
                }
            });
        });
    }
}
