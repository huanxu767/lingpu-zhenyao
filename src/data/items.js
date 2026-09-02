export const ITEMS = {
  thunder: {
    id: 'thunder',
    name: '雷火符',
    desc: '点选一格，对 3×3 造成巨额伤害',
    targeting: 'tile',
    damage: 1800,
  },
  nectar: {
    id: 'nectar',
    name: '甘露瓶',
    desc: '点选一株仙草，回复大量生命',
    targeting: 'plant',
    heal: 1800,
  },
  ingot: {
    id: 'ingot',
    name: '金元宝',
    desc: '立刻获得 50 灵露',
    targeting: 'instant',
    sun: 50,
  },
};

export const ITEM_ORDER = ['thunder', 'nectar', 'ingot'];
