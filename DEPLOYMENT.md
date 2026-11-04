# Deploy to Render

## 1. Create a MongoDB Atlas database

Create a MongoDB Atlas cluster and database user. In Atlas Network Access, allow connections from Render. Render's outbound IP addresses can vary, so Atlas may require `0.0.0.0/0`; use a dedicated database user with a strong password and do not reuse an administrator account. Add the database name `medserve` to the connection string.

## 2. Push this repository to GitHub

Commit and push the project to a GitHub repository. Do not commit `.env` or paste database credentials into source files.

## 3. Create the Render service

In Render, choose **New > Blueprint**, connect the GitHub repository, and deploy the `render.yaml` Blueprint. When prompted, provide:

- `MONGODB_URI`: the Atlas connection string, including the database username and password.
- `ADMIN_API_TOKEN`: a long random secret. Generate one locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.

Render supplies `PORT` automatically. The Blueprint uses `/api/health` to check that the app and database are available. After deployment, open the `onrender.com` URL shown in the Render dashboard.

## Important

This project is suitable for a demo deployment, not real patient or protected health information. Before using real patient data, arrange a security, privacy, and regulatory compliance review. Render's free web service may sleep when idle, and its local filesystem is not persistent; MongoDB Atlas is the persistent data store.