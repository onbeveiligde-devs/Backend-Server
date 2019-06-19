const controller = require('../controllers/stream.controller');

module.exports = (app) => {
    app.post('/', controller.index);
    app.post('/watch/:channel', controller.watch);
    app.post('/stream/:channel', controller.stream);
    app.post('/golive/:channel', controller.goLife);
    app.post('/upload/:channel', controller.upload);
};