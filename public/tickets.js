const API_URL = 'http://localhost:3000/api';
const currentUserId = 'user-demo-123'; // In production, this would come from auth

let currentRole = 'frontend';
let currentTicket = null;

const roleSelect = document.getElementById('roleSelect');
const createTicketBtn = document.getElementById('createTicketBtn');
const createTicketModal = document.getElementById('createTicketModal');
const createTicketForm = document.getElementById('createTicketForm');
const ticketDetailModal = document.getElementById('ticketDetailModal');
const startTicketBtn = document.getElementById('startTicketBtn');
const completeTicketBtn = document.getElementById('completeTicketBtn');

// Event listeners
roleSelect.addEventListener('change', (e) => {
  currentRole = e.target.value;
  loadTickets();
});

createTicketBtn.addEventListener('click', () => {
  createTicketModal.style.display = 'flex';
});

createTicketForm.addEventListener('submit', handleCreateTicket);
startTicketBtn.addEventListener('click', handleStartTicket);
completeTicketBtn.addEventListener('click', handleCompleteTicket);

// Load tickets on page load
loadTickets();

async function loadTickets() {
  try {
    const response = await fetch(`${API_URL}/tickets`);
    const allTickets = await response.json();
    
    // Filter by current role
    const roleTickets = allTickets.filter(t => t.role === currentRole);
    
    // Group by status
    const available = roleTickets.filter(t => t.status === 'open');
    const inProgress = roleTickets.filter(t => t.status === 'in-progress');
    const completed = roleTickets.filter(t => t.status === 'completed');
    
    displayTickets('availableTickets', available);
    displayTickets('inProgressTickets', inProgress);
    displayTickets('completedTickets', completed);
    
  } catch (error) {
    console.error('Error loading tickets:', error);
  }
}

function displayTickets(containerId, tickets) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  if (tickets.length === 0) {
    container.innerHTML = '<p class="empty-column">No tickets</p>';
    return;
  }
  
  tickets.forEach(ticket => {
    const ticketCard = createTicketCard(ticket);
    container.appendChild(ticketCard);
  });
}

function createTicketCard(ticket) {
  const card = document.createElement('div');
  card.className = 'ticket-card';
  card.onclick = () => openTicketDetail(ticket);
  
  card.innerHTML = `
    <div class="ticket-card-header">
      <h4>${ticket.title}</h4>
      <span class="difficulty-badge ${ticket.difficulty}">${ticket.difficulty}</span>
    </div>
    <p class="ticket-description">${ticket.description.substring(0, 100)}${ticket.description.length > 100 ? '...' : ''}</p>
    <div class="ticket-footer">
      <span class="points">⭐ ${ticket.points} pts</span>
      ${ticket.related_clips && ticket.related_clips.length > 0 
        ? `<span class="clips-count">📹 ${ticket.related_clips.length} clips</span>` 
        : ''}
    </div>
  `;
  
  return card;
}

function openTicketDetail(ticket) {
  currentTicket = ticket;
  
  document.getElementById('detailTitle').textContent = ticket.title;
  document.getElementById('detailRole').textContent = ticket.role;
  document.getElementById('detailDifficulty').textContent = ticket.difficulty;
  document.getElementById('detailPoints').textContent = `⭐ ${ticket.points} points`;
  document.getElementById('detailDescription').textContent = ticket.description;
  
  // Load related clips
  loadRelatedClips(ticket.related_clips);
  
  // Show appropriate action button
  if (ticket.status === 'open') {
    startTicketBtn.style.display = 'block';
    completeTicketBtn.style.display = 'none';
  } else if (ticket.status === 'in-progress') {
    startTicketBtn.style.display = 'none';
    completeTicketBtn.style.display = 'block';
  } else {
    startTicketBtn.style.display = 'none';
    completeTicketBtn.style.display = 'none';
  }
  
  ticketDetailModal.style.display = 'flex';
}

async function loadRelatedClips(clipIds) {
  const container = document.getElementById('relatedClips');
  container.innerHTML = '';
  
  if (!clipIds || clipIds.length === 0) {
    container.innerHTML = '<p class="no-clips">No related clips yet</p>';
    return;
  }
  
  for (const clipId of clipIds) {
    try {
      const response = await fetch(`${API_URL}/clips/${clipId}`);
      const clip = await response.json();
      
      const clipItem = document.createElement('div');
      clipItem.className = 'related-clip-item';
      clipItem.innerHTML = `
        <video src="${clip.file_path.replace('./uploads', 'http://localhost:3000/uploads')}" 
               width="120" height="80"></video>
        <div class="clip-info-mini">
          <p>${clip.title}</p>
          <span>${Math.floor(clip.end_time - clip.start_time)}s</span>
        </div>
      `;
      clipItem.onclick = () => window.open(`/library.html?clip=${clipId}`, '_blank');
      
      container.appendChild(clipItem);
    } catch (error) {
      console.error('Error loading clip:', error);
    }
  }
}

async function handleStartTicket() {
  if (!currentTicket) return;
  
  try {
    await fetch(`${API_URL}/tickets/${currentTicket.id}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUserId })
    });
    
    ticketDetailModal.style.display = 'none';
    loadTickets();
    
    alert('🎉 Ticket started! Good luck!');
  } catch (error) {
    console.error('Error starting ticket:', error);
    alert('Failed to start ticket');
  }
}

async function handleCompleteTicket() {
  if (!currentTicket) return;
  
  try {
    const response = await fetch(`${API_URL}/tickets/${currentTicket.id}/complete`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUserId })
    });
    
    const data = await response.json();
    
    ticketDetailModal.style.display = 'none';
    loadTickets();
    
    alert(`🎉 Ticket completed! You earned ${data.points_earned} points!\nTotal: ${data.new_points} points (Level ${data.new_level})`);
  } catch (error) {
    console.error('Error completing ticket:', error);
    alert('Failed to complete ticket');
  }
}

async function handleCreateTicket(e) {
  e.preventDefault();
  
  const ticketData = {
    title: document.getElementById('ticketTitle').value,
    description: document.getElementById('ticketDescription').value,
    role: document.getElementById('ticketRole').value,
    difficulty: document.getElementById('ticketDifficulty').value,
    points: parseInt(document.getElementById('ticketPoints').value),
    related_clips: []
  };
  
  try {
    await fetch(`${API_URL}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticketData)
    });
    
    createTicketModal.style.display = 'none';
    createTicketForm.reset();
    loadTickets();
    
    alert('✅ Ticket created successfully!');
  } catch (error) {
    console.error('Error creating ticket:', error);
    alert('Failed to create ticket');
  }
}
