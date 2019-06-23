const controller = require('../controllers/user.controller');

module.exports = (app) => {
    app.get('/user', controller.list);
    // app.get('/user/:id', controller.get);
    app.get('/user/:key', controller.getByKey);
    app.post('/user/login', controller.login);
    app.post('/user/register', controller.register);
};