pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

const pdfInput = document.getElementById('pdf-input');
const dropZone = document.getElementById('dropzone');
const viewer = document.querySelector('.viewer');
const pdfCanvas = document.getElementById('viewer');
const controls = document.querySelector(".controls");

const scaleInfo = document.querySelector('.scale-info');
const pageInfo = document.querySelector(".page-info");
const rotationInfo = document.querySelector(".rotation-info");

const properties = document.querySelector(".properties");
const pageNumberInput = document.getElementById("page-number");
const gotoPageSection = document.querySelector('.goto-page');
const gotoPageBtn = document.querySelector('.goto-page-btn');
const filename = document.querySelector('.filename');

const initialState = {
  pdfFile: null,
  filename: null,
  currentPage: 1,
  totalPages: 0,
  scale: 1.2,
  rotatePosition: 0,
  pageRendering: false,
  pageNumPending: null
}

const ROTATE_TRANSITION = ['transition-transform', 'duration-500', 'transition-property-all', 'duration-200'];

if (performance.getEntriesByType("navigation")[0].type === 'reload') {
  zoomResetPage();
  queueRenderPage(1);
}

async function getFile(file) {
  const loadingTask = pdfjsLib.getDocument(file);
  initialState.pdfFile = await loadingTask.promise;
  zoomResetPage();
}

async function renderPage(pageNumber) {
  if (!initialState.pdfFile) return;

  initialState.pageRendering = true;

  initialState.totalPages = await initialState.pdfFile?.numPages
  const page = await initialState.pdfFile?.getPage(pageNumber);

  const viewport = page.getViewport({ scale: initialState.scale });
  const context = pdfCanvas.getContext('2d', { willReadFrequently: true });

  pdfCanvas.height = viewport.height;
  pdfCanvas.width = viewport.width;

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };

  let renderTask = page.render(renderContext);

  renderTask.promise.then(function () {
    initialState.pageRendering = false;
    if (initialState.pageNumPending !== null) {
      renderPage(initialState.pageNumPending);
      initialState.pageNumPending = null;
    }
  });
  if (initialState.pdfFile) {
    displayPageInfo();
    displayGotoPageInput();
  }
  if (initialState.totalPages) {
    pageNumberInput.placeholder = `1-${initialState.totalPages}`;
  }
}

function queueRenderPage(num) {
  if (initialState.pageRendering) {
    initialState.pageNumPending = num;
  } else {
    renderPage(num);
  }
}

pdfInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  initialState.filename = file?.name;

  initialState.currentPage = 1;
  if (file && file.type === 'application/pdf') {
    pdfCanvas.style.display = 'block';
    controls.style.display = 'flex';
    const fileReader = new FileReader();

    fileReader.onload = (e) => {
      const arrBuffer = e.target.result;
      getFile(arrBuffer);
    };
    fileReader.readAsArrayBuffer(file);
  } else {
    console.error('Please select a valid PDF file.');
  }
});

dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', async (event) => {
  event.preventDefault();
  dropZone.classList.remove('dragover');

  const file = event.dataTransfer.files[0];
  initialState.filename = file.name;
  initialState.currentPage = 1;

  if (file && file.type === 'application/pdf') {
    pdfCanvas.style.display = 'block';
    controls.style.display = 'flex';
    const fileReader = new FileReader();

    fileReader.onload = (e) => {
      const arrBuffer = e.target.result;
      getFile(arrBuffer);
    };
    fileReader.readAsArrayBuffer(file);
  } else {
    console.error('Please drop a valid PDF file.');
  }
});

function rotatePage() {
  pdfCanvas.classList.add(...ROTATE_TRANSITION);
  initialState.rotatePosition = (initialState.rotatePosition + 90) % 450;
  if (initialState.rotatePosition === 360) {
    pdfCanvas.classList.remove(...ROTATE_TRANSITION);
    rotateResetPage();
  }
  viewer.style.overflow = 'hidden';
  pdfCanvas.style.transform = `rotate(${initialState.rotatePosition}deg)`;
  setTimeout(() => {
    viewer.style.overflow = 'auto';
  }, 2000);
  displayRotationInfo();
  if (initialState.rotatePosition === 0) {
    rotationInfo.innerText = '';
  }
}

function previousPage() {
  if (initialState.currentPage > 1) {
    initialState.currentPage--;
    queueRenderPage(initialState.currentPage);
  }
}

function nextPage() {
  if (initialState.currentPage < initialState.totalPages) {
    initialState.currentPage++;
    queueRenderPage(initialState.currentPage);
  }
}

function zoomInPage() {
  if (initialState.scale < 2.2) {
    initialState.scale += 0.1;
    viewer.style.overflow = 'auto';
    queueRenderPage(initialState.currentPage);
    displayScaleInfo();
  }
}

function zoomOutPage() {
  if (initialState.scale > 1.2) {
    initialState.scale -= 0.1;
    queueRenderPage(initialState.currentPage);
    displayScaleInfo();
  }
}

function zoomResetPage() {
  initialState.scale = 1.2;
  scaleInfo.innerText = '';
  queueRenderPage(initialState.currentPage);
}

function rotateResetPage() {
  initialState.rotatePosition = 0;
  queueRenderPage(initialState.currentPage);
}

const buttonHandlers = {
  '.zoom-in': zoomInPage,
  '.zoom-out': zoomOutPage,
  '.zoom-reset': zoomResetPage,
  '.rotate': rotatePage,
  '.previous-page': previousPage,
  '.next-page': nextPage
};

Object.keys(buttonHandlers).forEach(btnClass => {
  const btn = document.querySelector(btnClass);
  if (btn && buttonHandlers[btnClass]) {
    btn.addEventListener("click", buttonHandlers[btnClass]);
  }
});

function displayScaleInfo() {
  scaleInfo.innerText = `${Math.round((initialState.scale - 0.2) * 100)}%`;
}

function displayPageInfo() {
  pageInfo.innerText = `${initialState.currentPage} / ${initialState.totalPages}`;
}

function displayRotationInfo() {
  rotationInfo.innerText = `${initialState.rotatePosition}º`;
}

function displayGotoPageInput() {
  gotoPageSection.style.display = 'flex';
  displayFilename()
}

const isInRange = initialState.currentPage > 0 && initialState.currentPage <= initialState.totalPages;

function gotoPage() {
  initialState.currentPage = +pageNumberInput.value;
  const isInRange = initialState.currentPage > 0 && initialState.currentPage <= initialState.totalPages;
  if (isInRange) {
    queueRenderPage(initialState.currentPage)
    clearGotoPageInput()
  }
}

function clearGotoPageInput() {
  pageNumberInput.value = '';
}

gotoPageBtn.addEventListener('click', () => {
  gotoPage();
});

pageNumberInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    gotoPage();
  }
})

function displayFilename() {
  const span = document.createElement('span');
  span.className = 'font-semibold text-[var(--black)]';
  span.textContent = `<${initialState.filename}>`;

  filename.innerHTML = 'in ';
  filename.appendChild(span);
}



