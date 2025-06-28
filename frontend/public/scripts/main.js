// Gestion du tableau de bord
document.addEventListener('DOMContentLoaded', () => {
    // Création d'une nouvelle réunion
    const createMeetingForm = document.getElementById('create-meeting');
    if (createMeetingForm) {
        createMeetingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('meeting-title').value;
            
            try {
                const response = await fetch('/meeting/new', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `title=${encodeURIComponent(title)}`
                });
                
                const data = await response.json();
                if (data.meeting_id) {
                    window.location.href = `/meeting/${data.meeting_id}`;
                }
            } catch (error) {
                console.error('Error creating meeting:', error);
                alert('Failed to create meeting. Please try again.');
            }
        });
    }
    
    // Copie du lien de la réunion
    document.querySelectorAll('.copy-meeting-link').forEach(button => {
        button.addEventListener('click', (e) => {
            const meetingId = e.target.dataset.meetingId;
            const meetingLink = `${window.location.origin}/meeting/${meetingId}`;
            
            navigator.clipboard.writeText(meetingLink)
                .then(() => {
                    const originalText = e.target.textContent;
                    e.target.textContent = 'Copied!';
                    setTimeout(() => {
                        e.target.textContent = originalText;
                    }, 2000);
                })
                .catch(err => {
                    console.error('Failed to copy:', err);
                });
        });
    });
    
    // Affichage/fermeture du modal de création
    const modal = document.getElementById('create-meeting-modal');
    if (modal) {
        const openModalBtn = document.getElementById('open-create-modal');
        const closeModalBtn = document.getElementById('close-create-modal');
        
        if (openModalBtn) {
            openModalBtn.addEventListener('click', () => {
                modal.classList.remove('hidden');
            });
        }
        
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        }
        
        // Fermer le modal en cliquant à l'extérieur
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    }
});