const schedule = require('node-schedule');
const Binance = require('node-binance-api');
const TelegramBot = require('node-telegram-bot-api');
const {mongoose} = require("mongoose");
const {Schema} = require("mongoose");
const url = "mongodb+srv://sezer_user:wdHymqcILRzhMgO4@bitcoinnotifier.n7lk9.mongodb.net/?retryWrites=true&w=majority";
const token = '5418906922:AAEpbEGP5N1eKo0mV21NTeQ5UpgtulLkPdo';

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

  const bot = new TelegramBot(token, {polling: true});

  schedule.scheduleJob('*/10 * * * *', async function () {
    let ticker = await binance.prices();

    for (const symbol of Object.keys(ticker)) {
      if (!String(symbol).endsWith("USDT")) {
        continue;
      }

      Coin.findOne({symbol: symbol}, async (err, coin) => {
        if (coin) {
          if ((1 - ticker[symbol] / coin.price) > 0.05) {
            bot.sendMessage(
              -1001727687759,
              `${symbol} - ${coin.price} -> ${ticker[symbol]}`
            )
          }

          coin.price = ticker[symbol]
          await coin.save()
        } else {
          await Coin.create({symbol: symbol, price: ticker[symbol]})
        }
      })
    }
  });
}

main().then(console.log).catch(console.error)
