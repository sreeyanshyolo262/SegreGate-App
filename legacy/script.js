// Popup Elements
const popup = document.getElementById('popup');
const startBtn = document.getElementById('startBtn');

// Main App Elements
const wasteInput = document.getElementById('wasteInput');
const classifyBtn = document.getElementById('classifyBtn');
const resultSection = document.getElementById('result');
const errorMessage = document.getElementById('error');
const loading = document.getElementById('loading');
const wasteItem = document.getElementById('wasteItem');
const classificationBox = document.getElementById('classification');

// Close popup and start the app
startBtn.addEventListener('click', () => {
    popup.style.animation = 'fadeOut 0.4s ease-out forwards';
    setTimeout(() => {
        popup.classList.add('hidden');
        wasteInput.focus();
    }, 400);
});

// Add fadeOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);

// Handle enter key press
wasteInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        classifyWaste();
    }
});

classifyBtn.addEventListener('click', classifyWaste);

async function classifyWaste() {
    const waste = wasteInput.value.trim();

    if (!waste) {
        showError('Please enter a waste item');
        return;
    }

    // Clear previous results
    resultSection.classList.add('hidden');
    errorMessage.classList.add('hidden');

    // Show loading
    loading.classList.remove('hidden');

    try {
        const response = await fetch('/api/classify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ waste: waste })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to classify waste');
        }

        const data = await response.json();

        // Display result
        wasteItem.textContent = data.waste;
        classificationBox.textContent = data.classification;
        resultSection.classList.remove('hidden');

    } catch (error) {
        showError(error.message);
    } finally {
        loading.classList.add('hidden');
    }
}

function showError(message) {
    errorMessage.textContent = '❌ ' + message;
    errorMessage.classList.remove('hidden');
}
