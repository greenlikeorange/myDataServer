'use strict';

const config = require('config');
const debug = require('debug')('_HC:app');
const http = require('http');
const koa = require('koa');
const koaBody = require('koa-body');
const Router = require('koa-router');
const moment = require('moment');
const Pug = require('koa-pug');
const app = new koa();

const router = new Router();

const mongoose = require('mongoose');
mongoose.connect('localhost/myData');
mongoose.Promise = global.Promise;

const Schema = mongoose.Schema;
const MyGeoDataSchema = new Schema({
  _device: { type: String },
  _loc: {
    type: { type: String, default: 'Point'},
    coordinates: [Number]
  },
  coords: {
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    altitude: Number,
    heading: Number,
    speed: Number,
  },
  mocked: Boolean,
  timestamp: Date
}, {
  strict: true,
  timestamps: true
})

MyGeoDataSchema.index({_loc: '2dsphere'});

const MyGeoData = mongoose.model('MyGeoData', MyGeoDataSchema);

router.get('/show', async (ctx, next) => {
  if (ctx.request.query.access_token !== 'my_S3cr37') {
    const err = new Error('Not authorized')
    err.status = 401
    throw err;
  }

  var speed = ctx.request.query.speed || 5;
  var skipStops = !!ctx.request.query.skipstops;
  var date = moment().subtract(ctx.request.query.day || 0, 'days')

  ctx.render('map', { range: [
    date.clone().startOf('day').toDate().getTime(),
    date.clone().endOf('day').toDate().getTime()
  ], speed: speed, skipStops: skipStops });
})

router.get('/get/geodata', async (ctx, next) => {

  if (ctx.request.query.access_token !== 'my_S3cr37') {
    const err = new Error('Not authorized')
    err.status = 401
    throw err;
  }

  let {
    rangeStart = moment().endOf('day').toDate().getTime(),
    rangeEnd = moment().startOf('day').toDate().getTime()
  } = ctx.request.query;

  rangeStart = parseInt(rangeStart, 10);
  rangeEnd = parseInt(rangeEnd, 10);

  rangeStart = moment(rangeStart).isValid() ?
    moment(rangeStart).toDate() :
    moment().endOf('day').toDate().getTime();
  rangeEnd = moment(rangeEnd).isValid() ?
    moment(rangeEnd).toDate() :
    moment().startOf('day').toDate().getTime();

  const records = await MyGeoData.find({
    timestamp: {
      $gte: rangeStart,
      $lte: rangeEnd,
    }
  }).sort({
    timestamp: 1
  }).exec();
  ctx.body = { success: true, data: records }
})

router.post('/insert/geodata', async (ctx, next) => {

  if (ctx.request.query.access_token !== 'my_S3cr37') {
    const err = new Error('Not authorized')
    err.status = 401
    throw err;
  }

  let device = ctx.request.body.deviceInfo;
  let records = ctx.request.body.data;

  if (!records) {
    var err = new Error('No Records');
    err.status = 400;
    throw err;
  }

  records = records.map((record) => {
    record._device = device.uniqueID;
    record._loc  = {
      type: 'Point',
      coordinates: [record.coords.longitude, record.coords.latitude]
    };
    return record;
  })

  if (records.length === 0) {
    ctx.body = { success: true, createdCount: records.length }
    return;
  }

  try {
    let insert = await MyGeoData.create(records);
    ctx.body = { success: true, createdCount: records.length }
  } catch (err) {
    console.error(err)
    throw err;
  }
})

const pug = new Pug({
  viewPath: './views',
  basedir: './extends',
  debug: false,
  pretty: false,
  compileDebug: false,
  app: app
})

app.use(koaBody());
app.use(router.routes());
app.use(router.allowedMethods());
// Error handling
app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    ctx.status = err.statusCode || err.status || 500

    if (process.env.NODE_ENV !== 'production') {
      ctx.body = {
        success: false,
        error: {
          message: err.stack || err
        }
      }
    } else {
      ctx.body = {
        success: false,
        error: {
          message: err.toString()
        }
      }
    }
  }
})

// 404 Error
app.use(async (ctx, next) => {
  await next()

  if (404 !== ctx.status) return

  let notFound = new Error(`End point dosen\'t exists!`)
  notFound.status = 404

  throw notFound;
})

const server = http.createServer(app.callback()).listen(config.server.port, function () {
  console.log('%s listening at port %d', config.server.name, config.server.port)
})

module.exports = {
  closeServer() {
    server.close()
  }
}
