'use strict';
const https = require('https');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const green = '\x1b[32m';
const red = '\x1b[31m';


//Промисификация функций
const question = str => new Promise(resolve => rl.question(str, resolve));
const request = async url => new Promise((resolve, reject) => {
  https.get(url, async res => {
    const buffers = [];
    for await (const chunk of res) buffers.push(chunk);
    const data = JSON.parse(Buffer.concat(buffers).toString());
    if (data.Response === 'Error') reject(data.Message);
    resolve(data);
  })
  //Чтобы отловить событие ошибки, потом нужно починить
    .on('error', reject);
});

//Запись ответа в файл
const writeFile = async resultTxt => {
  const selection = parseInt(await question('Print 1 to save results\n'));
  if (selection === 1) {
    const fileName = ('Write the name of txt file to save your results\n');
    const txtName = await question(fileName);
    fs.writeFileSync(`${txtName}.txt`, resultTxt.join('\n'), 'utf8');
    return txtName;

  } else {
    process.exit();
  }

};

//Враппер для обработки ошибок
const errorWrapper = handleError => func => (...args) =>
  func(...args).catch(handleError);

const handleError = e => {
  console.log(`Something gone wrong, error:\n${e}`);
  process.exit();
};

const errorHandlerWrapped = errorWrapper(handleError);

//Обернутая функция request
const safeRequest = errorHandlerWrapped(request);

class Crypto {
  constructor(key) {
    this.defaultUrl = 'https://min-api.cryptocompare.com/data';
    this._apiKey = (key) ? key : null;
  }

  async currencyToCrypto() {
    const currency = await question('Type currency you want to convert\n');
    const query = this.defaultUrl + `/price?fsym=BTC&tsyms=${currency}`;
    const result = await safeRequest(query);
    const resultText = [];
    if (result) {
      const keys = Object.keys(result);
      for (const key of keys) {
        resultText.push(`${key}: ${result[key]}`);
      }
      console.log(`${resultText.join('\n')}\n`);
      await writeFile(resultText);
    }
    rl.close();
    return result;
  }

  async topFiveCurrencies() {
    const query = this.defaultUrl + '/top/totalvolfull?limit=10&tsym=USD';
    const currencies = (await safeRequest(query)).Data;
    currencies.splice(4, 5);
    const resultText = [];
    const result = currencies.map(item => item.CoinInfo.FullName);
    result.forEach((el, index) => {
      resultText.push(`${index + 1}. ${el}`);
    });
    console.log(`${resultText.join('\n')}\n`);
    await writeFile(resultText);
    rl.close();
    return result;
  }


  async currencyPriceVolume() {
    const currText = 'Type curr you want to get 24h volume of/res curr\n';
    const [curr, volumeCurr] = (await question(currText)).split(',');
    const url = `/v2/histoday?fsym=${curr}&tsym=${volumeCurr}&limit=1`;
    const query = this.defaultUrl + url;
    const result = await safeRequest(query);
    const data = result.Data;
    const resultText = [];
    let priceDiff = data.Data[1].close - data.Data[0].close;
    priceDiff = priceDiff.toFixed(2);
    const lowest = `${data.Data[1].low} ${volumeCurr}`;
    const highest = `${data.Data[1].high} ${volumeCurr} `;
    let diff = `${priceDiff} ${volumeCurr}`;
    if (result) {
      const lowText = `The lowest price  for 24 hours is: ${lowest}`;
      const lowestText = red + lowText + green;
      const highestText = `The highest price for 24 hours is: ${highest}`;
      diff = (priceDiff > 0) ? '+' + diff : diff;
      const diffText = `24 hour price differance: ${diff}`;
      resultText.push(lowestText, highestText, diffText);
      console.log(`${resultText.join('\n')}\n`);
      await writeFile(resultText);

    }
    rl.close();
    return result.Data;
  }


  static from(key) {
    return new Crypto(key);
  }

}

module.exports = { question, Crypto, request, writeFile, errorWrapper };
