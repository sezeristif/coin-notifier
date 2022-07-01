const schedule = require('node-schedule');
const Binance = require('node-binance-api');
const TelegramBot = require('node-telegram-bot-api');
const {mongoose} = require("mongoose");
const {Schema} = require("mongoose");
const url = "mongodb+srv://sezer_user:wdHymqcILRzhMgO4@bitcoinnotifier.n7lk9.mongodb.net/?retryWrites=true&w=majority";
const token = '5418906922:AAEpbEGP5N1eKo0mV21NTeQ5UpgtulLkPdo';
const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

const coinSchema = new Schema({
  symbol: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
}, {timestamps: true})

const Coin = mongoose.model("Coin", coinSchema);

async function main() {
  await mongoose.connect(url);
  console.log("Connected successfully to server");

  const binance = new Binance()

  const bot = new TelegramBot(token);

  bot.onText(/\/echo (.+)/, (msg, match) => {
    const message = match[1];
    if (message === "stop") {
      schedule.gracefulShutdown();
    }

    if (message === "start") {
      schedule.gracefulShutdown();
      schedule.scheduleJob('*/2 * * * *', bitcoinNotifier);
    }

    if (message === "set-minute") {

    }
  });

  bot.on("polling_error", console.log);

  const bitcoinNotifier = async () => {
    let ticker = await binance.prices();

    for (const symbol of Object.keys(ticker)) {
      if (!String(symbol).endsWith("USDT")) {
        continue;
      }

      Coin.findOne({symbol: symbol}, async (err, coin) => {
        if (coin) {
          if (((ticker[symbol] / coin.price) - 1) > 0.02) {
            try {
              bot.sendMessage(
                -1001727687759,
                `++ %${((ticker[symbol] / coin.price) - 1) * 100} ${symbol} - ${coin.price} -> ${ticker[symbol]}`
              )
            } catch (error) {
            }
          }

          if ((1 - (ticker[symbol] / coin.price)) > 0.02) {
            try {
              bot.sendMessage(
                -1001727687759,
                `-- %${(1 - (ticker[symbol] / coin.price)) * 100} ${symbol} - ${coin.price} -> ${ticker[symbol]}`
              )
            } catch (error) {
            }
          }

          coin.price = ticker[symbol]
          await coin.save()
        } else {
          await Coin.create({symbol: symbol, price: ticker[symbol]})
        }
      })
    }
  }

  schedule.scheduleJob('*/2 * * * *', bitcoinNotifier);
}

main().then(console.log).catch(console.error)
