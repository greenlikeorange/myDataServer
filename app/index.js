'use strict';

const config = require('config')
const debug = require('debug')('_HC:app')
const http = require('http')
const koa = require('koa')
const koaBody = require('koa-body');
const Router = require('koa-router');
const app = new koa()

const router = new Router()

const mongoose = require('mongoose');
mongoose.connect('localhost/myData')
mongoose.Promise = global.Promise;

const Schema = mongoose.Schema;
const MyGeoDataSchema = new Schema({
  _loc: {
    type: { type: String, default: 'Point'}
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

router.post('/insert/geodata', async function (ctx, next) {
  let records = ctx.request.body.data;
  debug(ctx.request.body.data)

  if (!records) {
    var err = new Error('No Records');
    err.status = 400;
    throw err;
  }

  records = records.map((record) => {
    record._loc = [record.latitude, record.longitude];
    return record;
  })

  let insert = await MyGeoData.create(records);
  ctx.body = { success: true, createdCount: records.length }
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
