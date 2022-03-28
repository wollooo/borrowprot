"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const bignumber_1 = require("@ethersproject/bignumber");
const contracts_1 = require("@ethersproject/contracts");
const providers_1 = require("@ethersproject/providers");
const lib_base_1 = require("@liquity/lib-base");
const outputFile = "eth-usd.csv";
const phase = 2;
const answerDecimals = 8;
const liquityDecimals = 18;
const answerMultiplier = bignumber_1.BigNumber.from(10).pow(liquityDecimals - answerDecimals);
const firstRound = bignumber_1.BigNumber.from("0x10000000000000000").mul(phase);
const aggregatorAddress = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
const aggregatorAbi = [
    "function latestAnswer() view returns (int256)",
    "function latestTimestamp() view returns (uint256)",
    "function latestRound() view returns (uint256)",
    "function getAnswer(uint256 roundId) view returns (int256)",
    "function getTimestamp(uint256 roundId) view returns (uint256)",
    "event AnswerUpdated(int256 indexed current, uint256 indexed roundId, uint256 timestamp)",
    "event NewRound(uint256 indexed roundId, address indexed startedBy)"
];
function* range(start, end) {
    for (let i = start; i.lt(end); i = i.add(1)) {
        yield i;
    }
}
const formatDateTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return (
    // Weird that Google Sheets likes this mixed format...
    `${date.toLocaleDateString("en-US", { timeZone: "UTC" })} ` +
        `${date.toLocaleTimeString("en-GB", { timeZone: "UTC" })}`);
};
(async () => {
    const provider = new providers_1.AlchemyProvider("mainnet", "LfzNw5K5sLuITGhCxFObHJWMHY_1HW6M");
    const aggregator = new contracts_1.Contract(aggregatorAddress, aggregatorAbi, provider);
    const getRound = (roundId) => Promise.all([
        aggregator.getTimestamp(roundId),
        aggregator.getAnswer(roundId)
    ]).then(([timestamp, answer]) => [
        `${roundId}`,
        `${timestamp}`,
        formatDateTime(timestamp.toNumber()),
        `${lib_base_1.Decimal.fromBigNumberString(answer.mul(answerMultiplier).toHexString())}`
    ]);
    const roundsPerPass = 10;
    // const latestRound = await aggregator.latestRound();
    const latestRound = bignumber_1.BigNumber.from("0x200000000000015A6");
    const totalRounds = latestRound.sub(firstRound).toNumber();
    const passes = Math.ceil((totalRounds + 1) / roundsPerPass);
    fs_1.default.writeFileSync(outputFile, "");
    for (let pass = 0; pass < passes; ++pass) {
        const start = firstRound.add(pass * roundsPerPass);
        const end = firstRound.add(Math.min((pass + 1) * roundsPerPass, totalRounds + 1));
        console.log(`Pass ${pass} out of ${passes} (rounds ${start} - ${end.sub(1)})`);
        const answers = await Promise.all(Array.from(range(start, end)).map(i => getRound(i)));
        fs_1.default.appendFileSync(outputFile, answers.map(answer => answer.join(",")).join("\n") + "\n");
    }
})();
//# sourceMappingURL=scrape-eth-usd.js.map