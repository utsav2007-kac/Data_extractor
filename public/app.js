document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const jobForm = document.getElementById('jobForm');
  const keywordInput = document.getElementById('keyword');
  const locationInput = document.getElementById('location');
  const leadLimitInput = document.getElementById('leadLimit');
  
  const activeJobSection = document.getElementById('activeJobSection');
  const jobStatusBadge = document.getElementById('jobStatusBadge');
  const statTarget = document.getElementById('statTarget');
  const statProcessed = document.getElementById('statProcessed');
  const statSaved = document.getElementById('statSaved');
  const statDuplicates = document.getElementById('statDuplicates');
  const statFailed = document.getElementById('statFailed');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const jobMessage = document.getElementById('jobMessage');
  
  const pauseBtn = document.getElementById('pauseBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const exportContainer = document.getElementById('exportContainer');
  const exportBtnText = document.getElementById('exportBtnText');
  
  const exportCsv = document.getElementById('exportCsv');
  const exportJson = document.getElementById('exportJson');
  const exportXlsx = document.getElementById('exportXlsx');
  
  const leadsTableBody = document.getElementById('leadsTableBody');
  const searchInput = document.getElementById('searchInput');
  const paginationControls = document.getElementById('paginationControls');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  const pageInfo = document.getElementById('pageInfo');
  
  // State
  let currentJobId = null;
  let eventSource = null;
  let allLeads = []; // Client side cache for search (in a real prod app with millions, use server-side search)
  let currentPage = 1;
  let itemsPerPage = 50;

  // Show Toast
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      if (container.contains(toast)) {
        container.removeChild(toast);
      }
    }, 3500);
  }

  function escapeHtml(unsafe) {
    if (!unsafe) return 'N/A';
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }

  function renderLeadsTable(leads) {
    if (leads.length === 0) {
      leadsTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">No real leads extracted yet.</td></tr>';
      return;
    }

    leadsTableBody.innerHTML = leads.map(lead => `
      <tr>
        <td>
          ${lead.website ? `<a href="${escapeHtml(lead.website)}" target="_blank" rel="noopener noreferrer">${escapeHtml(lead.businessName)}</a>` : escapeHtml(lead.businessName)}
        </td>
        <td>${escapeHtml(lead.phone)}</td>
        <td>${escapeHtml(lead.address)}</td>
        <td>${lead.rating !== null ? lead.rating : 'N/A'}</td>
        <td>${lead.reviewCount !== null ? lead.reviewCount : 'N/A'}</td>
        <td>
          ${lead.mapsUrl ? `<a href="${escapeHtml(lead.mapsUrl)}" target="_blank" rel="noopener noreferrer">Maps Link</a>` : 'N/A'}
        </td>
      </tr>
    `).join('');
  }

  async function fetchLeads(page = 1) {
    if (!currentJobId) return;
    try {
      const res = await fetch(`${window.APP_CONFIG.API_BASE_URL}/api/jobs/${currentJobId}/leads?page=${page}&limit=${itemsPerPage}`);
      const data = await res.json();
      if (data.success) {
        allLeads = data.leads; // Update cache
        renderLeadsTable(data.leads);
        
        // Update pagination
        currentPage = data.page;
        pageInfo.textContent = `Page ${currentPage} of ${Math.ceil(data.total / itemsPerPage) || 1}`;
        
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage * itemsPerPage >= data.total;
        
        if (data.total > 0) {
          paginationControls.style.display = 'flex';
          exportBtnText.textContent = `Export ${data.total} Leads`;
          exportContainer.style.display = 'inline-block';
        } else {
          paginationControls.style.display = 'none';
          exportContainer.style.display = 'none';
        }
      }
    } catch (err) {
      console.error('Failed to fetch leads', err);
    }
  }

  function updateJobUI(job) {
    activeJobSection.style.display = 'block';
    
    statTarget.textContent = job.target;
    statProcessed.textContent = job.processed;
    statSaved.textContent = job.saved;
    statDuplicates.textContent = job.duplicates;
    statFailed.textContent = job.failed;
    
    const progress = Math.min((job.saved / job.target) * 100, 100).toFixed(1);
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `${progress}%`;
    
    jobStatusBadge.textContent = job.status;
    jobStatusBadge.className = `badge ${job.status}`;

    // Button states
    pauseBtn.style.display = ['starting', 'running'].includes(job.status) ? 'inline-block' : 'none';
    resumeBtn.style.display = job.status === 'paused' ? 'inline-block' : 'none';
    cancelBtn.style.display = ['queued', 'starting', 'running', 'paused'].includes(job.status) ? 'inline-block' : 'none';

    // Status message
    if (job.status === 'blocked') {
      jobMessage.textContent = `Google Maps challenge detected: ${job.blockedReason || 'Blocked'}. ${job.saved} real leads were preserved.`;
    } else if (job.status === 'completed_partial') {
      jobMessage.textContent = `Extraction completed partially. ${job.saved} real leads were extracted from a target of ${job.target}.`;
    } else if (job.status === 'completed') {
      jobMessage.textContent = `Extraction completed. ${job.saved} real leads were extracted.`;
    } else if (job.status === 'cancelled') {
      jobMessage.textContent = `Extraction cancelled. ${job.saved} real leads were preserved.`;
    } else if (job.status === 'failed') {
      jobMessage.textContent = `Extraction failed: ${job.errorMessage}. ${job.saved} leads preserved.`;
    } else {
      jobMessage.textContent = '';
    }

    if (job.saved > 0) {
       exportBtnText.textContent = `Export ${job.saved} Leads`;
       exportContainer.style.display = 'inline-block';
    } else {
       exportContainer.style.display = 'none';
    }
  }

  async function syncJobState() {
    if (!currentJobId) return;
    try {
      const res = await fetch(`${window.APP_CONFIG.API_BASE_URL}/api/jobs/${currentJobId}`);
      const data = await res.json();
      if (data.success) {
        updateJobUI(data.job);
        fetchLeads(currentPage);
      }
    } catch (err) {
      console.error('Failed to sync job state', err);
    }
  }

  function connectSSE(jobId) {
    if (eventSource) {
      eventSource.close();
    }
    eventSource = new EventSource(`${window.APP_CONFIG.API_BASE_URL}/api/jobs/${jobId}/events`);

    eventSource.onmessage = (e) => {
      // Heartbeats
      if (e.data === 'heartbeat') return;
      
      try {
        const payload = JSON.parse(e.data);
        const { type, data } = payload;
        
        switch (type) {
          case 'business_saved':
            // Add lead to current view if we are on first page and not searching
            if (currentPage === 1 && !searchInput.value) {
               allLeads.unshift(data.lead);
               if (allLeads.length > itemsPerPage) allLeads.pop();
               renderLeadsTable(allLeads);
            }
            // Background sync occasionally
            if (Math.random() < 0.1) syncJobState();
            break;
          case 'progress':
            statSaved.textContent = data.saved;
            progressFill.style.width = `${data.progress}%`;
            progressText.textContent = `${data.progress.toFixed(1)}%`;
            if (data.saved > 0) {
               exportBtnText.textContent = `Export ${data.saved} Leads`;
               exportContainer.style.display = 'inline-block';
            }
            break;
          case 'blocked':
          case 'completed':
          case 'completed_partial':
          case 'cancelled':
          case 'failed':
            syncJobState();
            showToast(`Job ${type}`, type === 'completed' ? 'success' : 'warning');
            eventSource.close();
            break;
          case 'duplicate_skipped':
          case 'record_failed':
            // Update stats subtly via sync
            break;
        }
      } catch (err) {}
    };

    eventSource.onerror = () => {
      console.warn('SSE connection lost. Reconnecting...');
      eventSource.close();
      setTimeout(() => {
        if (currentJobId) {
          syncJobState(); // Sync state before reconnecting
          connectSSE(currentJobId);
        }
      }, 5000);
    };
  }

  jobForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const payload = {
      keyword: keywordInput.value.trim(),
      location: locationInput.value.trim(),
      leadLimit: parseInt(leadLimitInput.value, 10)
    };

    try {
      const res = await fetch(`${window.APP_CONFIG.API_BASE_URL}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        currentJobId = data.jobId;
        currentPage = 1;
        showToast('Job created successfully', 'success');
        syncJobState();
        connectSSE(currentJobId);
        
        // Setup exports
        exportCsv.href = `${window.APP_CONFIG.API_BASE_URL}/api/jobs/${currentJobId}/export.csv`;
        exportJson.href = `${window.APP_CONFIG.API_BASE_URL}/api/jobs/${currentJobId}/export.json`;
        exportXlsx.href = `${window.APP_CONFIG.API_BASE_URL}/api/jobs/${currentJobId}/export.xlsx`;
        
      } else {
        showToast(data.error.message, 'error');
      }
    } catch (err) {
      showToast('Network error while creating job', 'error');
    }
  });

  pauseBtn.addEventListener('click', async () => {
    if (!currentJobId) return;
    await fetch(`${window.APP_CONFIG.API_BASE_URL}/api/jobs/${currentJobId}/pause`, { method: 'POST' });
    syncJobState();
  });

  resumeBtn.addEventListener('click', async () => {
    if (!currentJobId) return;
    await fetch(`${window.APP_CONFIG.API_BASE_URL}/api/jobs/${currentJobId}/resume`, { method: 'POST' });
    syncJobState();
  });

  cancelBtn.addEventListener('click', async () => {
    if (!currentJobId) return;
    if (confirm('Are you sure you want to cancel this job?')) {
      await fetch(`${window.APP_CONFIG.API_BASE_URL}/api/jobs/${currentJobId}/cancel`, { method: 'POST' });
      syncJobState();
    }
  });

  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      fetchLeads(currentPage - 1);
    }
  });

  nextPageBtn.addEventListener('click', () => {
    fetchLeads(currentPage + 1);
  });

  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    if (!term) {
      renderLeadsTable(allLeads);
      return;
    }
    const filtered = allLeads.filter(l => 
      (l.businessName && l.businessName.toLowerCase().includes(term)) ||
      (l.phone && l.phone.includes(term)) ||
      (l.address && l.address.toLowerCase().includes(term))
    );
    renderLeadsTable(filtered);
  });

});
