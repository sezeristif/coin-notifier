const TelegramBot = require("node-telegram-bot-api");
const schedule = require("node-schedule");
const Binance = require("node-binance-api");
const { mongoose } = require("mongoose");
const { Schema } = require("mongoose");
const url =
  "mongodb+srv://sezer_user:wdHymqcILRzhMgO4@bitcoinnotifier.n7lk9.mongodb.net/?retryWrites=true&w=majority";
const token = "5418906922:AAEpbEGP5N1eKo0mV21NTeQ5UpgtulLkPdo";
const express = require("express");
const app = express();
const port = 8080;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const coinSchema = new Schema(
  {
    symbol: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

const Coin = mongoose.model("Coin", coinSchema);

async function main() {
  await mongoose.connect(url);
  console.log("Connected successfully to server");

  await Coin.collection.drop();

  const binance = new Binance();

  const bot = new TelegramBot(token, { polling: true });

  bot.onText(/\/echo (.+)/, (msg, match) => {
    const message = match[1];
    if (message === "stop") {
      schedule.gracefulShutdown();
      bot.sendMessage(-1001727687759, "stopped");
    }

    if (message === "start") {
      schedule.gracefulShutdown();
      Coin.collection.drop();
      bot.sendMessage(-1001727687759, "started");
      schedule.scheduleJob("*/2 * * * *", bitcoinNotifier);
    }
  });

  const bitcoinNotifier = async () => {
    let ticker = await binance.prices();

    for (const symbol of Object.keys(ticker)) {
      if (!String(symbol).endsWith("USDT")) {
        continue;
      }

      Coin.findOne({ symbol: symbol }, async (err, coin) => {
        if (coin) {
          if (ticker[symbol] / coin.price - 1 > 0.02) {
            try {
              bot.sendMessage(
                -1001727687759,
                `++ %${parseInt(
                  (ticker[symbol] / coin.price - 1) * 100
                )} ${symbol} - ${coin.price} -> ${ticker[symbol]}`
              );
            } catch (error) {}
          }

          if (1 - ticker[symbol] / coin.price > 0.02) {
            try {
              bot.sendMessage(
                -1001727687759,
                `-- %${parseInt(
                  (1 - ticker[symbol] / coin.price) * 100
                )} ${symbol} - ${coin.price} -> ${ticker[symbol]}`
              );
            } catch (error) {}
          }

          coin.price = ticker[symbol];
          await coin.save();
        } else {
          await Coin.create({ symbol: symbol, price: ticker[symbol] });
        }
      });
    }
  };

  schedule.scheduleJob("*/2 * * * *", bitcoinNotifier);
}

main().then(() => {
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
});
