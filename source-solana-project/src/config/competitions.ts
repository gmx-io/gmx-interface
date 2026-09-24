// devnet competition list

export enum TradeModel {
  OPEN = 'open',
  CLOSED = 'closed',
  ALL = 'all',
}

const devnetCompetionList = [
  {
    name: 'One',
    address: 'DwcDMxKBgMS3LruQAEsvwnvAsXM7T3bwkMvGg92pjhF8',
    basePrize: 10000,
    tradeModel: TradeModel.ALL,
    treasuryPriceFactor: 0.3,
  },
  {
    name: 'Two',
    address: '8vTTiCgqv7zQN7X1WuY5bRMZjByjJzZqiF9SLYEntL65',
    basePrize: 10000,
    tradeModel: TradeModel.ALL,
    treasuryPriceFactor: 0.3,
  },
  {
    name: 'Three',
    address: 'Bgma1tVTq1v6g1nxkvoCVRG7tyJHB9UFsdkTbo2mAGSc',
    basePrize: 10000,
    tradeModel: TradeModel.ALL,
    treasuryPriceFactor: 0.3,
  },
  {
    name: 'Four',
    address: 'D8q1x59MbeGqyuP9sf6EP7LwKEfBrBnVNYsrg92TKQ4w',
    basePrize: 10000,
    tradeModel: TradeModel.ALL,
    treasuryPriceFactor: 0.3,
  },
  {
    name: 'Five',
    address: 'FhA9KC7ZaotW9Jk4zRNRN2R1GHUe8rpPwortJUk2HcNv',
    basePrize: 10000,
    tradeModel: TradeModel.ALL,
    treasuryPriceFactor: 0.3,
  },
  {
    name: 'Six',
    address: '2hiwPTiyJvE9gXn1mX6iS9YSXNi1JiS9NGkoKXwwX56Z',
    basePrize: 10000,
    tradeModel: TradeModel.ALL,
    treasuryPriceFactor: 0.3,
  },
  {
    name: 'Seven',
    address: 'pxc8toA4in1mvh9qpBVCMutyZjDZs3JPXaWXTjr4Cnh',
    basePrize: 10000,
    tradeModel: TradeModel.ALL,
    treasuryPriceFactor: 0.3,
  },
  {
    name: 'Eight',
    address: '8L7RZjQd6dwarCCi3vrbLbApjfPxb76sTLd92qWQ8ryp',
    basePrize: 10000,
    tradeModel: TradeModel.ALL,
    treasuryPriceFactor: 0.3,
  },
];

// mainnet competition list
const mainnetCompetionList = [
  {
    name: 'SPARK',
    address: '6h1xBJts1outoHCJHuvZaSYVSuhWDT3zGdvP9jBP9XnN',
    basePrize: 9000,
    tradeModel: TradeModel.ALL,
    treasuryPriceFactor: 0.3,
    showMoreAbout: true,
  },
  {
    name: 'CLASH',
    address: '8dh2wVJ2jb5WAZ4vLYrprrL7B1vJ9HgCu4xhF3faaBBT',
    basePrize: 30000,
    tradeModel: TradeModel.OPEN,
    treasuryPriceFactor: 0.3,
    showMoreAbout: false,
  },
  // {
  //   "name": "SPARK",
  //   "address": "7j72dLoM6UgGiFyhM1ez3hKQjdao1py6kwp9fp4nhfi9",
  //   "basePrize": 9000,
  //   "tradeModel": TradeModel.ALL,
  //   "treasuryPriceFactor": 0.3,
  //   "showMoreAbout": false
  // },
  // {
  //   "name": "SPARK",
  //   "address": "5JqJpzdSQLJgvLuB6LjTsQc1b9ebKKLKG4MSoNEQYjRn",
  //   "basePrize": 9000,
  //   "tradeModel": TradeModel.OPEN,
  //   "treasuryPriceFactor": 0.3,
  //   "showMoreAbout": false
  // },
  // {
  //   "name": "SPARK",
  //   "address": "46owuF9cxK4vHQgHpzMWZtyyjxaXrJawe9rPRDxNykZE",
  //   "basePrize": 9000,
  //   "tradeModel": TradeModel.OPEN,
  //   "treasuryPriceFactor": 0.3,
  //   "showMoreAbout": false
  // },
  // {}
];

const competition_env = import.meta.env
  .VITE_GMX_SOLANA_COMPETITION_ENV as string;
export const competitions =
  competition_env === 'mainnet' ? mainnetCompetionList : devnetCompetionList;
