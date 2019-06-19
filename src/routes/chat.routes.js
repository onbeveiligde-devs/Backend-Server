const controller = require('../controllers/chat.controller');

module.exports = (app) => {
    app.get('/chat/:user', controller.allByUserId);
    app.post('/chat', controller.create);
};