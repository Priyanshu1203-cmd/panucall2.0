const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Serve static files
app.use(express.static('public'));

// Store connected users
const users = {};

io.on('connection', (socket) => {
    console.log('🔗 New connection:', socket.id);

    // Register user
    socket.on('register', (userId) => {
        console.log('👤 User registered:', userId);
        users[userId] = socket.id;
        socket.userId = userId;
        
        // Confirm registration
        socket.emit('registered', { userId: userId });
        console.log('📊 Connected users:', Object.keys(users));
    });

    // Handle call offers
    socket.on('call', (data) => {
        console.log('📞 Call from:', socket.userId, 'to:', data.to);
        
        const targetSocketId = users[data.to];
        if (targetSocketId) {
            console.log('✅ Forwarding call to:', data.to);
            io.to(targetSocketId).emit('incoming-call', {
                from: socket.userId,
                offer: data.offer
            });
        } else {
            console.log('❌ User not found:', data.to);
            socket.emit('call-failed', { reason: 'user-not-found', target: data.to });
        }
    });

    // Handle call acceptance
    socket.on('accept-call', (data) => {
        console.log('✅ Call accepted by:', socket.userId, 'for:', data.to);
        
        const targetSocketId = users[data.to];
        if (targetSocketId) {
            io.to(targetSocketId).emit('call-accepted', {
                answer: data.answer
            });
        }
    });

    // Handle ICE candidates
    socket.on('ice-candidate', (data) => {
        const targetSocketId = users[data.to];
        if (targetSocketId) {
            io.to(targetSocketId).emit('ice-candidate', {
                candidate: data.candidate
            });
        }
    });

    // Handle hangup
    socket.on('hangup', (data) => {
        console.log('📞 Hangup from:', socket.userId);
        const targetSocketId = users[data.to];
        if (targetSocketId) {
            io.to(targetSocketId).emit('call-ended');
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('❌ User disconnected:', socket.id);
        if (socket.userId && users[socket.userId]) {
            delete users[socket.userId];
            console.log('🗑️ Removed user:', socket.userId);
        }
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Open: http://localhost:${PORT}`);
});