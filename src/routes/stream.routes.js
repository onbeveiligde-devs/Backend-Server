const controller = require('../controllers/stream.controller');

module.exports = (app) => {
    app.get('/streamIndex', controller.index);
    app.get('/watch/:channel', controller.watch);
    app.get('/stream/:channel', controller.stream);
    app.get('/golive/:channel', controller.goLife);
    app.post('/upload/:channel', controller.upload);
};