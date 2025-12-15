# Voyage Budget

A simple travel budget planner web application built with HTML, CSS, JavaScript, and Node.js.

## Features

- Trip cost estimation with detailed breakdown
- Trip planning form with origin, destination, dates, and preferences
- Trip history storage and display
- Responsive design with clean UI
- Pricing information page

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Data Storage:** In-memory (for demo purposes)

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd voyage-budget
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Fill out the trip planning form with your travel details
2. Click "Estimate Cost" to get a detailed cost breakdown
3. Save your trip to view it in the trip history
4. Navigate between Home, Trip History, and Pricing pages

## API Endpoints

- `POST /api/estimate` - Calculate trip cost
- `GET /api/trips` - Get trip history

## Deployment

### Local Deployment

1. Ensure Node.js is installed
2. Run `npm install` to install dependencies
3. Run `npm start` to start the production server
4. The app will be available on port 3000

### Online Deployment

1. **Heroku:**
   - Create a Heroku account
   - Install Heroku CLI
   - Run `heroku create`
   - Push to Heroku: `git push heroku main`
   - The app will be deployed automatically

2. **Vercel:**
   - Install Vercel CLI: `npm i -g vercel`
   - Run `vercel` in the project directory
   - Follow the prompts to deploy

3. **Railway:**
   - Connect your GitHub repository
   - Railway will auto-deploy on pushes

4. **Render:**
   - Create a Render account
   - Connect your repository
   - Set build command: `npm install`
   - Set start command: `npm start`

## Project Structure

```
voyage-budget/
├── server.js          # Express server
├── package.json       # Dependencies and scripts
├── public/
│   ├── index.html     # Main HTML page
│   ├── style.css      # Stylesheet
│   └── app.js         # Client-side JavaScript
└── README.md          # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License
