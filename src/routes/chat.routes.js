const controller = require('../controllers/chat.controller');

module.exports = (app) => {
    app.get('/chat', controller.list);
    app.get('/chat/:user', controller.allByUserId);
    app.post('/chat/:user', controller.create);
};