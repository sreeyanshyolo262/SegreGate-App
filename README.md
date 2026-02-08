# Waste Classifier Website

A simple web application that classifies waste into different categories using the Groq API.

## Features

- **Waste Classification**: Input any waste item and get instant categorization
- **5 Waste Categories**:
  - ♻️ Dry Waste (paper, cardboard, plastic, wood)
  - 🌱 Wet Waste (food scraps, leaves, organic matter)
  - 🔵 Recyclable (metal, glass, recyclable paper)
  - ⚫ Non-Recyclable (items that cannot be recycled)
  - 🔴 Medical Waste (medical equipment, syringes, masks)
- **Simple, Concise Answers**: Get brief one-line classifications instead of long paragraphs
- **Beautiful UI**: Modern, responsive design

## Setup Instructions

### 1. Get Your Groq API Key
- Visit [https://console.groq.com](https://console.groq.com)
- Sign up and create a new API key
- Copy your API key

### 2. Install Dependencies
```bash
cd c:\Users\Tanu\Code\wasteProj
npm install
```

### 3. Add Your API Key
Edit the `.env` file and replace `your_groq_api_key_here` with your actual Groq API key:
```
GROQ_API_KEY=gsk_your_actual_api_key_here
```

### 4. Run the Server
```bash
npm start
```

The server will start on `http://localhost:3000`

### 5. Open in Browser
Navigate to `http://localhost:3000` and start classifying waste!

## How It Works

1. User enters a waste item in the input field
2. Frontend sends the request to the backend API
3. Backend uses Groq API with a system prompt that instructs it to classify waste
4. Groq returns a one-line classification (no long paragraphs)
5. Result is displayed to the user

## API Endpoint

**POST** `/classify-waste`

Request:
```json
{
  "waste": "plastic bottle"
}
```

Response:
```json
{
  "waste": "plastic bottle",
  "classification": "Recyclable - This is a plastic bottle that can be recycled."
}
```

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **API**: Groq SDK
- **Models**: Mixtral-8x7b-32768

## File Structure

```
wasteProj/
├── package.json          # Project dependencies
├── server.js            # Express server and Groq API integration
├── .env                 # Environment variables (add your API key here)
├── .env.example         # Example env file
└── public/
    ├── index.html       # Main webpage
    ├── styles.css       # Styling
    └── script.js        # Frontend logic
```

## Notes

- The AI is instructed to give short, one-line answers to avoid long paragraphs
- The temperature is set to 0.3 for consistent, deterministic responses
- Max tokens are limited to 100 to ensure brief answers
- The system works best with common waste items
