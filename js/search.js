// ============================================================
//  M BEAUTY STUDIO — Buscador y Filtros Funcionales
// ============================================================

// Detectar si estamos en la carpeta pages
const BASE_URL = window.location.pathname.includes('/pages/') ? '../' : '';

document.addEventListener('DOMContentLoaded', () => {
  initSearch();
  initFilterAnimations();
});

// ============================================================
// SEARCH MODAL
// ============================================================
function initSearch() {
  // Buscar el Icono de búsqueda en el navbar
  const searchIcon = document.querySelector('.icon-link img[alt="Buscar"]');
  const searchTrigger = document.querySelector('.search-trigger');
  const searchContainer = document.querySelector('.search-container');
  
  // Si no hay ningún trigger, salir
  if (!searchIcon && !searchTrigger && !searchContainer) return;
  
  const searchLink = searchTrigger || (searchIcon && searchIcon.closest('a'));

  // Crear modal de búsqueda si no existe
  if (!document.querySelector('.search-modal')) {
    const modal = document.createElement('div');
    modal.className = 'search-modal';
    modal.innerHTML = `
      <div class="search-modal-backdrop"></div>
      <div class="search-modal-content">
        <div class="search-modal-header">
          <h5 class="mb-0">¿Qué servicio buscas?</h5>
          <button class="btn-close search-modal-close" aria-label="Cerrar"></button>
        </div>
        <div class="search-modal-body">
          <div class="position-relative mb-4">
            <img src="${BASE_URL}icons/search.svg" alt="Buscar" class="position-absolute search-icon-modal">
            <input type="text" class="form-control rounded-pill ps-5 py-3 search-input-modal" placeholder="Escribe Algo...">
          </div>
          <div class="search-suggestions">
            <p class="small text-muted mb-3 fw-semibold">Búsquedas populares:</p>
            <div class="d-flex flex-wrap gap-2">
              <button class="search-suggestion-tag" data-filter="maquillaje">Maquillaje</button>
              <button class="search-suggestion-tag" data-filter="social">Social</button>
              <button class="search-suggestion-tag" data-filter="novia">Novia</button>
              <button class="search-suggestion-tag" data-filter="quinceañera">Quinceañeras</button>
              <button class="search-suggestion-tag" data-filter="peinado">Peinados</button>
            </div>
          </div>
          <div class="search-results mt-4 d-none">
            <hr class="my-3">
            <p class="small text-muted mb-2">Resultados:</p>
            <div class="search-results-list"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Event listeners del modal
    const closeBtn = modal.querySelector('.search-modal-close');
    const backdrop = modal.querySelector('.search-modal-backdrop');
    const input = modal.querySelector('.search-input-modal');
    const resultsDiv = modal.querySelector('.search-results');
    const resultsList = modal.querySelector('.search-results-list');

    closeBtn.addEventListener('click', closeSearchModal);
    backdrop.addEventListener('click', closeSearchModal);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSearchModal();
    });

    // Suggestion tags - búsqueda directa
    modal.querySelectorAll('.search-suggestion-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const filter = tag.dataset.filter;
        if (filter) {
          applyFilter(filter);
          closeSearchModal();
        }
      });
    });

    // Buscar mientras escribe
    let debounceTimer;
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        performSearch(input.value);
      }, 300);
    });

    function closeSearchModal() {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }

    function performSearch(query) {
      if (query.trim().length === 0) {
        resultsDiv.classList.add('d-none');
        return;
      }

      // Buscar tanto en servicios como en cursos
      const services = document.querySelectorAll('.service-card');
      const courses = document.querySelectorAll('.course-card');
      const allItems = [...services, ...courses];
      
      let foundCount = 0;
      resultsList.innerHTML = '';

      allItems.forEach(card => {
        const titleEl = card.querySelector('h5, h6');
        const title = titleEl ? titleEl.textContent.toLowerCase() : '';
        const desc = card.querySelector('.text-muted').textContent.toLowerCase();
        const searchLower = query.toLowerCase();

        if (title.includes(searchLower) || desc.includes(searchLower)) {
          foundCount++;
          const price = card.querySelector('.text-primary-pink, .fs-5').textContent;
          const duration = card.querySelector('.text-muted.fw-semibold')?.textContent || card.querySelector('.course-info-bar')?.textContent || '';
          const imgSrc = card.querySelector('.card-img-top, .course-img').src;
          const isService = card.classList.contains('service-card');
          const resultItem = document.createElement('a');
          resultItem.href = '#';
          resultItem.className = 'search-result-item';
          resultItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center p-2 rounded">
              <div class="d-flex align-items-center gap-3">
                <img src="${imgSrc}" alt="${title}" width="50" height="50" style="object-fit: cover; border-radius: 8px;">
                <div>
                  <strong>${titleEl.textContent}</strong>
                  <small class="d-block text-muted">${isService ? 'Servicio' : 'Curso'} • ${price}</small>
                </div>
              </div>
              <span class="btn btn-sm btn-primary-pink rounded-pill">Ver</span>
            </div>
          `;
          resultItem.addEventListener('click', (e) => {
            e.preventDefault();
            closeSearchModal();
            if (isService) {
              showServiceDetail(card);
            } else {
              // Para cursos, hacer scroll al card
              card.scrollIntoView({ behavior: 'smooth', block: 'center' });
              card.style.boxShadow = '0 0 0 3px var(--primary-pink)';
              setTimeout(() => {
                card.style.boxShadow = '';
              }, 2000);
            }
          });
          resultsList.appendChild(resultItem);
        }
      });

      resultsDiv.classList.remove('d-none');
      if (foundCount === 0) {
        resultsList.innerHTML = '<p class="text-muted small">No se encontraron resultados. Intenta con otro término.</p>';
      }
    }
  }

  // Abrir modal al hacer click en el icono de búsqueda
  if (searchLink) {
    searchLink.addEventListener('click', (e) => {
      e.preventDefault();
      openSearchModal();
    });
  }
  
  // También abrir modal al hacer click en el search-container (input de búsqueda)
  if (searchContainer) {
    searchContainer.addEventListener('click', (e) => {
      e.preventDefault();
      openSearchModal();
    });
  }

  function openSearchModal() {
    const modal = document.querySelector('.search-modal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        const input = modal.querySelector('.search-input-modal');
        if (input) input.focus();
      }, 100);
    }
  }
}

// ============================================================
// FILTER FUNCTIONALITY
// ============================================================
function initFilterAnimations() {
  const filterPills = document.querySelectorAll('.filter-pill');
  
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      // Remover active de todos
      filterPills.forEach(p => p.classList.remove('active'));
      // Activar el clickeado
      pill.classList.add('active');
      
      // Obtener el filtro del texto
      const filterText = pill.textContent.trim().toLowerCase();
      
      let filterCategory = '';
      if (filterText.includes('todas')) {
        filterCategory = 'todas';
      } else if (filterText.includes('maquillaje')) {
        filterCategory = 'maquillaje';
      } else if (filterText.includes('peinados')) {
        filterCategory = 'peinado';
      } else if (filterText.includes('novias')) {
        filterCategory = 'novia';
      } else if (filterText.includes('quinceañeras')) {
        filterCategory = 'quinceañera';
      } else if (filterText.includes('sociales')) {
        filterCategory = 'social';
      }
      
      applyFilter(filterCategory);
    });
  });
}

function applyFilter(category) {
  // Buscar tanto service-cards como course-cards
  const serviceCards = document.querySelectorAll('.service-card');
  const courseCards = document.querySelectorAll('.course-card');
  const allCards = [...serviceCards, ...courseCards];
  
  allCards.forEach((card, index) => {
    const titleEl = card.querySelector('h5, h6');
    const title = titleEl ? titleEl.textContent.toLowerCase() : '';
    const desc = card.querySelector('.text-muted').textContent.toLowerCase();
    
    let shouldShow = false;
    
    if (category === 'todas' || category === '') {
      shouldShow = true;
    } else if (category === 'maquillaje') {
      shouldShow = title.includes('maquillaje') || title.includes('skin care');
    } else if (category === 'peinado') {
      shouldShow = title.includes('peinado') || title.includes('cabello');
    } else if (category === 'novia') {
      shouldShow = title.includes('novia') || title.includes('evento') || title.includes('weddings');
    } else if (category === 'quinceañera') {
      shouldShow = title.includes('quinceañera') || title.includes('quince');
    } else if (category === 'social') {
      shouldShow = title.includes('social') || title.includes('automaquillaje');
    } else if (category === 'skincare') {
      shouldShow = title.includes('skin') || title.includes('piel');
    }
    
    // Animación de hide/show
    if (shouldShow) {
      card.style.display = '';
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, index * 80);
    } else {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      setTimeout(() => {
        card.style.display = 'none';
      }, 300);
    }
  });
}

// ============================================================
// SERVICE DETAIL MODAL
// ============================================================
function showServiceDetail(card) {
  let detailModal = document.querySelector('.service-detail-modal');
  if (!detailModal) {
    detailModal = document.createElement('div');
    detailModal.className = 'service-detail-modal';
    document.body.appendChild(detailModal);
  }
  
  const title = card.querySelector('h6').textContent;
  const desc = card.querySelector('.text-muted').textContent;
  const price = card.querySelector('.text-primary-pink').textContent;
  const duration = card.querySelector('.text-muted.fw-semibold')?.textContent || '';
  const imgSrc = card.querySelector('.card-img-top').src;
  const btnText = card.querySelector('.btn-primary-pink').textContent;
  
  detailModal.innerHTML = `
    <div class="detail-backdrop"></div>
    <div class="detail-content">
      <button class="btn-close detail-close" aria-label="Cerrar"></button>
      <div class="row g-0">
        <div class="col-md-6">
          <img src="${imgSrc}" alt="${title}" class="detail-img">
        </div>
        <div class="col-md-6">
          <div class="detail-body">
            <span class="badge bg-primary-pink mb-3">Servicio</span>
            <h3 class="fw-bold mb-2">${title}</h3>
            <p class="text-muted mb-4">${desc}</p>
            
            <div class="detail-info mb-4">
              <div class="d-flex align-items-center gap-2 mb-2">
                <img src="${BASE_URL}icons/clock-hour-11.png" width="20" alt="Duración">
                <span>${duration.trim()}</span>
              </div>
              <div class="d-flex align-items-center gap-2">
                <img src="${BASE_URL}icons/calendar-plus.svg" width="20" alt="Precio">
                <span class="fw-bold text-primary-pink h4 mb-0">${price}</span>
              </div>
            </div>
            
            <a href="#" class="btn btn-primary-pink w-100 rounded-pill py-3">
              <img src="${BASE_URL}icons/calendar-plus.svg" width="20" class="me-2" style="filter: brightness(0) invert(1);">
              ${btnText.trim()}
            </a>
            
            <div class="detail-features mt-4 pt-4 border-top">
              <p class="small fw-semibold mb-2">¿Qué incluye?</p>
              <ul class="list-unstyled small text-muted">
                <li class="mb-2"><img src="${BASE_URL}icons/check.svg" width="16" class="me-2" style="filter: brightness(0) saturate(100%) invert(50%) sepia(50%) hue-rotate(320deg) saturate(200%);"> Consulta previa de estilo</li>
                <li class="mb-2"><img src="${BASE_URL}icons/check.svg" width="16" class="me-2" style="filter: brightness(0) saturate(100%) invert(50%) sepia(50%) hue-rotate(320deg) saturate(200%);"> Productos profesionales</li>
                <li class="mb-2"><img src="${BASE_URL}icons/check.svg" width="16" class="me-2" style="filter: brightness(0) saturate(100%) invert(50%) sepia(50%) hue-rotate(320deg) saturate(200%);"> Acabado impecable</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Event listeners
  const closeBtn = detailModal.querySelector('.detail-close');
  const backdrop = detailModal.querySelector('.detail-backdrop');
  
  closeBtn.addEventListener('click', closeDetailModal);
  backdrop.addEventListener('click', closeDetailModal);
  
  // Abrir modal
  detailModal.classList.add('active');
  document.body.style.overflow = 'hidden';
  
  function closeDetailModal() {
    detailModal.classList.remove('active');
    document.body.style.overflow = '';
  }
}
