const crypto = require("crypto");
const openpgp = require("openpgp");
const fs = require("fs");
const path = require("path");
const KEYS_DIR = "keys";

const PRIV_KEY_TEXT = fs.readFileSync(
  path.join(KEYS_DIR, "priv.pgp.key"),
  "utf8"
);
const PUB_KEY_TEXT = fs.readFileSync(
  path.join(KEYS_DIR, "pub.pgp.key"),
  "utf8"
);

const POEM = `Someone is in the kitchen washing the dishes.
Someone is in the living room watching the news.
Someone in a bedroom is holding a used stamp with tweezers and adding it to his collection.
Someone is scolding a dog, barking now for decades, a different...`;

const blocks = [
  {
    index: 0,
    prevHash: "000000",
    data: "000000",
    timestamp: Date.now(),
    hash: "000000",
  },
];

const transactionHash = (trans) => {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(trans))
    .digest("hex");
};

const createSignature = async (line, privateKey) => {
  const options = {
    data: line,
    privateKeys: [(await openpgp.key.readArmored(privateKey)).keys[0]],
  };

  const { data } = await openpgp.sign(options);

  return data;
};

const authorizeTransaction = async (trans) => {
  trans.pubKey = PUB_KEY_TEXT;
  trans.signature = await createSignature(trans.data, PRIV_KEY_TEXT);

  return trans;
};

const createTransaction = (data) => {
  const trans = {
    index: blocks.length,
    prevHash: blocks[blocks.length - 1].hash,
    data,
    timestamp: Date.now(),
  };
  trans.hash = transactionHash(trans);

  return trans;
};

const addPoem = async () => {
  const trans$ = POEM.split("\n").map(async (line) => {
    const trans = createTransaction(line);
    await authorizeTransaction(trans);

    return trans;
  });
  const transactions = await Promise.all(trans$);

  const block = createTransaction(JSON.stringify(transactions));
  blocks.push(block);
};

const verifySignature = async (signature, pubKey) => {
  const { keys } = await openpgp.key.readArmored(pubKey);

  const result = await openpgp.verify({
    publicKeys: keys[0],
    message: await openpgp.cleartext.readArmored(signature),
  });

  return result.signatures[0].valid;
};

const verifyTransaction = async (trans) => {
  const { pubKey, signature, hash } = trans;

  if (!(pubKey && signature)) return false;

  if (!(await verifySignature(signature, pubKey))) return false;

  const { hash: h, pubKey: p, signature: s, ...hashableTrans } = trans;

  return hash === transactionHash(hashableTrans);
};

const verifyBlock = (block) => {
  const { data, hash, prevHash, index } = block;

  if (!data || !prevHash) return false;
  if (index < 0) return false;
  if (index === 0 && hash !== "000000") return false;

  if (index === 0) {
    return true;
  }
  const prevHashOk = prevHash === blocks[index - 1].hash;

  if (!prevHashOk) return false;

  if (index > 0) {
    const transactions = JSON.parse(data);

    return Promise.all(transactions.map((tr) => verifyTransaction(tr)));
  }
  return true;
};

addPoem().then(async () => {
  const verifyResults = await Promise.all(
    blocks.map((blk) => verifyBlock(blk))
  );
  console.log(verifyResults);
});
