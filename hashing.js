const crypto = require("crypto");

const initialTimestamp = Date.now();

const blockHash = (data) => {
  let hashData = data;

  if (typeof data !== "string") {
    hashData = JSON.stringify(data);
  }

  return crypto.createHash("sha256").update(hashData).digest("hex");
};

const blocks = [
  {
    index: 0,
    prevHash: "000000",
    data: "000000",
    timestamp: initialTimestamp,
    hash: "000000",
  },
];

const createBlock = (data) => {
  const timestamp = Date.now();
  const hashData = {
    index: blocks.length,
    prevHash: blocks[blocks.length - 1].hash,
    data,
    timestamp,
  };

  return {
    ...hashData,
    hash: blockHash(hashData),
  };
};

const verifyBlock = (block) => {
  const { data, hash, prevHash, index } = block;

  if (!data || !prevHash) return false;
  if (index < 0) return false;
  if (index === 0 && hash !== "000000") return false;

  if (index === 0) {
    return true;
  }
  const { hash: _, ...hashData } = block;

  const currentHashOk = hash === blockHash(hashData);
  const prevHashOk = prevHash === blocks[index - 1].hash;

  return currentHashOk && prevHashOk;
};

const verifyChain = () => {
  return !blocks.map((blk) => verifyBlock(blk)).some((ok) => !ok);
};

const poem = `Someone is in the kitchen washing the dishes.
Someone is in the living room watching the news.
Someone in a bedroom is holding a used stamp with tweezers and adding it to his collection.
Someone is scolding a dog, barking now for decades, a different...`;

poem.split("\n").forEach((line) => {
  blocks.push(createBlock(line));
});
console.log(blocks);

const chainOk = verifyChain();
console.log(chainOk);
