document.addEventListener('DOMContentLoaded', () => {
    // Connect to Socket.IO
    const socket = io();
    
    // WebRTC variables
    let localStream;
    let peers = {};
    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    
    // DOM elements
    const videoContainer = document.getElementById('video-container');
    const participantList = document.getElementById('participant-list');
    const participantCount = document.getElementById('participant-count');
    const toggleVideoBtn = document.getElementById('toggle-video');
    const toggleAudioBtn = document.getElementById('toggle-audio');
    const leaveMeetingBtn = document.getElementById('leave-meeting');
    
    // User media states
    let videoEnabled = true;
    let audioEnabled = true;
    
    // Join the meeting
    socket.emit('join', { meeting_id: meetingId, username: username });
    
    // Initialize local media
    async function initLocalMedia() {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            
            // Display local video
            addVideoStream('local', localStream);
            
            // Set up event listeners for buttons
            toggleVideoBtn.addEventListener('click', toggleVideo);
            toggleAudioBtn.addEventListener('click', toggleAudio);
            leaveMeetingBtn.addEventListener('click', leaveMeeting);
            
            // Listen for new participants
            socket.on('user_joined', handleNewParticipant);
            socket.on('user_left', handleParticipantLeft);
            socket.on('signal', handleSignal);
            
        } catch (err) {
            console.error('Error accessing media devices:', err);
        }
    }
    
    // Add a video stream to the container
    function addVideoStream(id, stream) {
        const videoElement = document.createElement('video');
        videoElement.id = id;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.srcObject = stream;
        
        const videoDiv = document.createElement('div');
        videoDiv.className = 'relative';
        videoDiv.appendChild(videoElement);
        
        if (id === 'local') {
            videoElement.muted = true;
            videoDiv.className += ' local-video';
        }
        
        videoContainer.appendChild(videoDiv);
    }
    
    // Toggle video on/off
    function toggleVideo() {
        videoEnabled = !videoEnabled;
        localStream.getVideoTracks().forEach(track => {
            track.enabled = videoEnabled;
        });
        toggleVideoBtn.classList.toggle('bg-gray-500', !videoEnabled);
        toggleVideoBtn.classList.toggle('bg-blue-600', videoEnabled);
    }
    
    // Toggle audio on/off
    function toggleAudio() {
        audioEnabled = !audioEnabled;
        localStream.getAudioTracks().forEach(track => {
            track.enabled = audioEnabled;
        });
        toggleAudioBtn.classList.toggle('bg-gray-500', !audioEnabled);
        toggleAudioBtn.classList.toggle('bg-blue-600', audioEnabled);
    }
    
    // Leave the meeting
    function leaveMeeting() {
        socket.emit('leave', { meeting_id: meetingId, username: username });
        
        // Stop all media tracks
        localStream.getTracks().forEach(track => track.stop());
        
        // Close all peer connections
        Object.keys(peers).forEach(id => {
            peers[id].close();
        });
        
        // Redirect to dashboard
        window.location.href = '/dashboard';
    }
    
    // Handle new participant
    function handleNewParticipant(data) {
        participantCount.textContent = data.participants;
        
        if (data.username !== username) {
            // Add to participant list
            const li = document.createElement('li');
            li.textContent = data.username;
            li.id = `participant-${data.username}`;
            participantList.appendChild(li);
            
            // Create peer connection
            createPeerConnection(data.username);
        }
    }
    
    // Handle participant leaving
    function handleParticipantLeft(data) {
        participantCount.textContent = data.participants;
        
        // Remove from participant list
        const li = document.getElementById(`participant-${data.username}`);
        if (li) li.remove();
        
        // Remove video and close connection
        const video = document.getElementById(data.username);
        if (video) video.parentElement.remove();
        
        if (peers[data.username]) {
            peers[data.username].close();
            delete peers[data.username];
        }
    }
    
    // Create a peer connection
    function createPeerConnection(peerId) {
        const peerConnection = new RTCPeerConnection(configuration);
        peers[peerId] = peerConnection;
        
        // Add local stream to connection
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        
        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('signal', {
                    meeting_id: meetingId,
                    to: peerId,
                    from: username,
                    type: 'candidate',
                    data: event.candidate
                });
            }
        };
        
        // Handle remote stream
        peerConnection.ontrack = (event) => {
            const stream = event.streams[0];
            addVideoStream(peerId, stream);
        };
        
        // Create offer
        peerConnection.createOffer()
            .then(offer => peerConnection.setLocalDescription(offer))
            .then(() => {
                socket.emit('signal', {
                    meeting_id: meetingId,
                    to: peerId,
                    from: username,
                    type: 'offer',
                    data: peerConnection.localDescription
                });
            })
            .catch(error => console.error('Error creating offer:', error));
    }
    
    // Handle signaling messages
    function handleSignal(data) {
        if (data.to !== username) return;
        
        const peerConnection = peers[data.from] || new RTCPeerConnection(configuration);
        
        if (!peers[data.from]) {
            peers[data.from] = peerConnection;
            
            // Add local stream to connection
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
            
            // Handle ICE candidates
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('signal', {
                        meeting_id: meetingId,
                        to: data.from,
                        from: username,
                        type: 'candidate',
                        data: event.candidate
                    });
                }
            };
            
            // Handle remote stream
            peerConnection.ontrack = (event) => {
                const stream = event.streams[0];
                addVideoStream(data.from, stream);
            };
        }
        
        if (data.type === 'offer') {
            peerConnection.setRemoteDescription(new RTCSessionDescription(data.data))
                .then(() => peerConnection.createAnswer())
                .then(answer => peerConnection.setLocalDescription(answer))
                .then(() => {
                    socket.emit('signal', {
                        meeting_id: meetingId,
                        to: data.from,
                        from: username,
                        type: 'answer',
                        data: peerConnection.localDescription
                    });
                })
                .catch(error => console.error('Error handling offer:', error));
        } else if (data.type === 'answer') {
            peerConnection.setRemoteDescription(new RTCSessionDescription(data.data))
                .catch(error => console.error('Error handling answer:', error));
        } else if (data.type === 'candidate') {
            peerConnection.addIceCandidate(new RTCIceCandidate(data.data))
                .catch(error => console.error('Error handling ICE candidate:', error));
        }
    }
    
    // Initialize the app
    initLocalMedia();
});