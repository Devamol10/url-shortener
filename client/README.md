# URL Shortener

## About the Project
This is a full-stack web application that takes long URLs and creates shorter, more manageable links. I built this project to get hands-on experience with full-stack development, particularly focusing on how the frontend and backend communicate and how to handle user data. Building this helped me understand the practical challenges of putting together a complete web application from scratch.

## Features
- User authentication (JWT + session)
- Email verification
- Google/GitHub OAuth
- URL shortening
- Rate limiting
- Basic security measures

## Tech Stack
Frontend:
- React
- Vite

Backend:
- Node.js
- Express
- MongoDB
- Passport.js
- Nodemailer

## Project Structure
The repository is split into two main directories:
- client/: Contains the frontend interface built with React.
- server/: Contains the backend API, database models, and authentication logic.

## Environment Variables
The project uses environment variables for configuration. You will find a .env.example file. Copy this file and rename it to .env, then fill in your specific configuration values like database credentials and API keys.

## How to Run Locally
1. Clone the repository to your local machine.
2. Run npm install in both the client and server directories to install dependencies.
3. Set up your .env files with the necessary environment variables.
4. Ensure MongoDB is running locally or provide a connection string for a remote database.
5. Start the backend server and frontend development environment.

## Deployment Notes
When moving this project to a production server, make sure all environment variables are correctly configured in the hosting provider's settings. Enabling HTTPS is required for the authentication cookies and overall security to function properly.

## What I Learned
Through this project, I learned a lot about backend security and how to protect API endpoints. Implementing rate limiting showed me how to prevent abuse, and I gained a better understanding of how to manage environment variables safely across different environments. Taking the application through the deployment process also taught me how these pieces fit together outside of a local development setup.


