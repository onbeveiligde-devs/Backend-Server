const Money = require('../models/db/Money');
const Hal = require('hal');

module.exports = {
    list: function (req, res) {
        console.log('try to get a list of moneys. ');

        Money.find()
            .then(moneys => {
                let resource = new Hal.Resource({
                    "moneys": moneys
                }, req.url);

                moneys.forEach(money => {
                    let str = req.url;
                    if (str.substr(-1) != '/') str += '/';
                    str += money._id;
                    resource.link(money._id, str);
                });

                res.send(resource);
            })
            .catch(err => {
                console.log('can not get a list of moneys. ', err);
                res.status(200);
                res.send(new Hal.Resource({
                    message: 'can not get a list of moneys.',
                    errors: err
                }, req.url));
            });
    },

    create: function (req, res) {
        console.log('try to create a money. ', req.body);

        const money = new Money(req.body);
        money.save()
            .then((reply) => {
                let resource = new Hal.Resource({
                    created: !money.isNew,
                    data: reply._doc
                }, req.url);

                let str = req.url;
                if (str.substr(-1) != '/') str += '/';
                str += money._id;
                resource.link(money._id, str);

                res.send(resource);
            })
            .catch(err => {
                console.log('can not create money. ', err);
                res.status(200);
                res.send(new Hal.Resource({
                    message: 'can not create money.',
                    errors: err
                }, req.url));
            });
    },

    get: function (req, res) {
        console.log('try to get money. ', req.params);

        Money.findOne({
                _id: req.params.id
            })
            .then(reply => {
                res.send(new Hal.Resource({
                    Money: reply._doc
                }, req.url));
            })
            .catch(err => {
                console.log('can not get money. ', err);
                res.status(200);
                res.send(new Hal.Resource({
                    message: 'can not get money.',
                    errors: err
                }, req.url));
            });
    }
};