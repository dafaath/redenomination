module.exports = {
  apps: [{
    name: "prod-app",
    script: "dist/app.js",
    instance_var: 'INSTANCE_ID',
    env: {
      "NODE_ENV": "production"
    }
  }],
};