# About

Script to check OpenSea listings for $DOPE that have unclaimed $PAPER.

# Installation

```
git clone https://github.com/celsowhite/dope-unclaimed.git
cd dope-unclaimed
mv .env.sample .env (add infura key)
npm install
npm install -g .
```

# Run

Run the dope-unclaimed command with an --eth argument. ETH is the max price of $DOPE you want to check for.

```
dope-unclaimed --eth=1
```
