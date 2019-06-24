const controller = require('../controllers/stream.controller');

module.exports = (app) => {
    app.get('/online', controller.online) 
    app.get(['/stream', '/streamIndex'], controller.index);
    app.get('/stream/:channel', controller.stream);
    app.get('/watch/:channel', controller.watch);
    app.get('/golive/:channel', controller.goLive);
    app.post('/upload/:channel', controller.upload);
};