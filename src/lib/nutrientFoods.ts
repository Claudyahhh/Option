export interface NutrientFoodGroup {
  nutrient: string;
  labelZh: string;
  foods: NutrientFood[];
}

export interface NutrientFood {
  name: string;
  amountPer100g: string;
}

const NUTRIENT_FOODS: NutrientFoodGroup[] = [
  {
    nutrient: 'iron',
    labelZh: '铁',
    foods: [
      { name: '猪肝', amountPer100g: '23mg/100g' },
      { name: '蛤蜊', amountPer100g: '28mg/100g' },
      { name: '牛肉', amountPer100g: '2.7mg/100g' },
      { name: '鸭血', amountPer100g: '30mg/100g' },
      { name: '菠菜', amountPer100g: '2.7mg/100g' },
      { name: '南瓜籽', amountPer100g: '8.8mg/100g' },
      { name: '黑豆', amountPer100g: '5.0mg/100g' },
      { name: '扁豆', amountPer100g: '3.3mg/100g' },
    ],
  },
  {
    nutrient: 'omega-3',
    labelZh: 'Omega-3',
    foods: [
      { name: '三文鱼', amountPer100g: '2.3g/100g' },
      { name: '沙丁鱼', amountPer100g: '1.5g/100g' },
      { name: '鲭鱼', amountPer100g: '2.6g/100g' },
      { name: '亚麻籽', amountPer100g: '22.8g/100g' },
      { name: '奇亚籽', amountPer100g: '17.8g/100g' },
      { name: '核桃', amountPer100g: '9.1g/100g' },
      { name: '紫苏籽', amountPer100g: '23g/100g' },
      { name: '鳕鱼', amountPer100g: '0.2g/100g' },
    ],
  },
  {
    nutrient: 'magnesium',
    labelZh: '镁',
    foods: [
      { name: '南瓜籽', amountPer100g: '535mg/100g' },
      { name: '黑巧克力', amountPer100g: '228mg/100g' },
      { name: '杏仁', amountPer100g: '270mg/100g' },
      { name: '腰果', amountPer100g: '292mg/100g' },
      { name: '菠菜', amountPer100g: '79mg/100g' },
      { name: '黑豆', amountPer100g: '171mg/100g' },
      { name: '牛油果', amountPer100g: '29mg/100g' },
      { name: '燕麦', amountPer100g: '177mg/100g' },
    ],
  },
  {
    nutrient: 'protein',
    labelZh: '蛋白质',
    foods: [
      { name: '鸡胸肉', amountPer100g: '31g/100g' },
      { name: '鸡蛋', amountPer100g: '13g/100g' },
      { name: '希腊酸奶', amountPer100g: '10g/100g' },
      { name: '北豆腐', amountPer100g: '12g/100g' },
      { name: '三文鱼', amountPer100g: '20g/100g' },
      { name: '牛肉', amountPer100g: '26g/100g' },
      { name: '毛豆', amountPer100g: '11g/100g' },
      { name: '扁豆', amountPer100g: '9g/100g' },
    ],
  },
  {
    nutrient: 'complex carbs',
    labelZh: '复合碳水',
    foods: [
      { name: '燕麦', amountPer100g: '66g/100g' },
      { name: '红薯', amountPer100g: '20g/100g' },
      { name: '糙米', amountPer100g: '23g/100g' },
      { name: '藜麦', amountPer100g: '21g/100g' },
      { name: '全麦面包', amountPer100g: '41g/100g' },
      { name: '鹰嘴豆', amountPer100g: '27g/100g' },
      { name: '玉米', amountPer100g: '19g/100g' },
      { name: '土豆', amountPer100g: '17g/100g' },
    ],
  },
  {
    nutrient: 'hydration',
    labelZh: '水分',
    foods: [
      { name: '白水', amountPer100g: '100ml/100g' },
      { name: '椰子水', amountPer100g: '95ml/100g' },
      { name: '黄瓜', amountPer100g: '95g水/100g' },
      { name: '西瓜', amountPer100g: '92g水/100g' },
      { name: '番茄', amountPer100g: '95g水/100g' },
      { name: '生菜', amountPer100g: '96g水/100g' },
      { name: '清汤', amountPer100g: '90ml/100g' },
      { name: '电解质饮料', amountPer100g: '约95ml/100g' },
    ],
  },
  {
    nutrient: 'fiber',
    labelZh: '膳食纤维',
    foods: [
      { name: '奇亚籽', amountPer100g: '34g/100g' },
      { name: '燕麦', amountPer100g: '10g/100g' },
      { name: '扁豆', amountPer100g: '8g/100g' },
      { name: '西兰花', amountPer100g: '2.6g/100g' },
      { name: '苹果', amountPer100g: '2.4g/100g' },
      { name: '覆盆子', amountPer100g: '6.5g/100g' },
      { name: '鹰嘴豆', amountPer100g: '7.6g/100g' },
      { name: '牛油果', amountPer100g: '6.7g/100g' },
    ],
  },
  {
    nutrient: 'calcium',
    labelZh: '钙',
    foods: [
      { name: '牛奶', amountPer100g: '120mg/100g' },
      { name: '酸奶', amountPer100g: '110mg/100g' },
      { name: '奶酪', amountPer100g: '700mg/100g' },
      { name: '北豆腐', amountPer100g: '138mg/100g' },
      { name: '沙丁鱼', amountPer100g: '382mg/100g' },
      { name: '羽衣甘蓝', amountPer100g: '150mg/100g' },
      { name: '芝麻酱', amountPer100g: '1170mg/100g' },
      { name: '小白菜', amountPer100g: '90mg/100g' },
    ],
  },
  {
    nutrient: 'vitamin d',
    labelZh: '维生素 D',
    foods: [
      { name: '三文鱼', amountPer100g: '10-25ug/100g' },
      { name: '蛋黄', amountPer100g: '5ug/100g' },
      { name: '强化牛奶', amountPer100g: '1ug/100g' },
      { name: '日晒蘑菇', amountPer100g: '10ug/100g' },
      { name: '沙丁鱼', amountPer100g: '4.8ug/100g' },
      { name: '金枪鱼', amountPer100g: '5.7ug/100g' },
      { name: '鳕鱼肝油', amountPer100g: '250ug/100g' },
      { name: '强化豆奶', amountPer100g: '1ug/100g' },
    ],
  },
];

const ALIASES: Record<string, string> = {
  fe: 'iron',
  'omega 3': 'omega-3',
  omega3: 'omega-3',
  carb: 'complex carbs',
  carbs: 'complex carbs',
  carbohydrate: 'complex carbs',
  carbohydrates: 'complex carbs',
  water: 'hydration',
};

function normalizeNutrient(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ');
  return ALIASES[normalized] ?? normalized;
}

export function getFoodGroupsForNutrients(raw: string): NutrientFoodGroup[] {
  const nutrients = raw
    .split(/[,，/+&、]/)
    .map(normalizeNutrient)
    .filter(Boolean);

  const matches = nutrients
    .map(nutrient => NUTRIENT_FOODS.find(group => group.nutrient === nutrient))
    .filter((group): group is NutrientFoodGroup => Boolean(group));

  return matches.length > 0 ? matches : [{
    nutrient: raw.trim(),
    labelZh: raw.trim(),
    foods: [
      { name: '鸡蛋', amountPer100g: '13g/100g' },
      { name: '深绿叶菜', amountPer100g: '视品种而定' },
      { name: '豆类', amountPer100g: '视品种而定' },
      { name: '鱼类', amountPer100g: '视品种而定' },
      { name: '坚果', amountPer100g: '视品种而定' },
    ],
  }];
}
