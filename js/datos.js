// ===== Mesero Virtual: datos de ejemplo =====
// Este archivo se carga antes que app.js, por eso app.js puede usar la variable R

// m: modo de personalización (q = quitar ingredientes, o = solo observaciones, n = ninguna)
// al: alérgenos, x: producto agotado
const R = [
  {
    id: 1,
    n: "Burger Craft & Grill",
    e: "🍔",
    c: "Hamburguesas artesanales",
    r: "4.9",
    tm: "15-20 min",
    loc: "Local 3",
    t: 15,
    d: "Carne 100% madurada, pan brioche horneado a diario y salsas de la casa.",
    P: [
      {
        id: "p101",
        n: "Burger Doble Queso Bacon",
        e: "🍔",
        c: "Hamburguesas",
        $: 28900,
        d: "Doble carne 150g, cheddar fundido, tocineta crocante y salsa ahumada.",
        i: ["Pan brioche", "Carne 150 g", "Cheddar", "Tocineta", "Salsa ahumada"],
        al: ["Gluten", "Lácteos"],
        m: "q"
      },
      {
        id: "p102",
        n: "Trufa & Mushroom Burger",
        e: "🍄",
        c: "Hamburguesas",
        $: 32000,
        d: "Champiñones en mantequilla de trufa, queso suizo y cebolla caramelizada.",
        i: ["Pan brioche", "Carne", "Champiñones", "Mantequilla de trufa", "Queso suizo", "Cebolla caramelizada"],
        al: ["Gluten", "Lácteos", "Cebolla"],
        m: "q"
      },
      {
        id: "p103",
        n: "Papas Rústicas con Queso & Bacon",
        e: "🍟",
        c: "Acompañamientos",
        $: 14500,
        d: "Papas en cascos con dip de cheddar y tocineta picada.",
        i: ["Papa", "Dip de cheddar", "Tocineta"],
        al: ["Lácteos"],
        m: "n"
      },
      {
        id: "p104",
        n: "Limonada de Coco Menta",
        e: "🍋",
        c: "Bebidas",
        $: 9500,
        d: "Limonada cremada con leche de coco y menta fresca.",
        i: ["Limón", "Leche de coco", "Menta"],
        al: [],
        m: "n",
        x: 1
      }
    ]
  },
  {
    id: 2,
    n: "Trattoria Pizza & Pasta",
    e: "🍕",
    c: "Italiana y pizzas al horno",
    r: "4.8",
    tm: "20-25 min",
    loc: "Local 7",
    t: 20,
    d: "Pizzas napolitanas al horno de piedra y pastas frescas artesanas.",
    P: [
      {
        id: "p201",
        n: "Pizza Pepperoni Suprema",
        e: "🍕",
        c: "Pizzas",
        $: 34900,
        d: "Salsa san marzano, mozzarella fiordilatte y generoso pepperoni.",
        i: ["Masa", "Salsa san marzano", "Mozzarella fiordilatte", "Pepperoni"],
        al: ["Gluten", "Lácteos"],
        m: "q"
      },
      {
        id: "p202",
        n: "Fettuccine Alfredo",
        e: "🍝",
        c: "Pastas",
        $: 29500,
        d: "Pasta artesanal en salsa alfredo con parmesano y pollo a la parrilla.",
        i: ["Pasta artesanal", "Salsa alfredo", "Parmesano", "Pollo a la parrilla"],
        al: ["Gluten", "Lácteos", "Huevo"],
        m: "o"
      },
      {
        id: "p203",
        n: "Pan de Ajo & Hierbas",
        e: "🥖",
        c: "Entradas",
        $: 11000,
        d: "Cuatro lonjas de baguette tostado con mantequilla de ajo.",
        i: ["Baguette", "Mantequilla de ajo", "Hierbas"],
        al: ["Gluten", "Lácteos", "Ajo"],
        m: "n"
      }
    ]
  },
  {
    id: 3,
    n: "Sabor Latino Grill",
    e: "🥩",
    c: "Cortes y comida típica",
    r: "4.7",
    tm: "15-25 min",
    loc: "Local 9",
    t: 15,
    d: "Parrilladas jugosas, arepas rellenas, patacones gourmet y sazón tradicional.",
    P: [
      {
        id: "p301",
        n: "Parrilla Mixta Personal",
        e: "🥩",
        c: "Carnes",
        $: 38000,
        d: "Lomo de res, pollo, chorizo, patacón y papa criolla.",
        i: ["Lomo de res", "Pollo", "Chorizo", "Patacón", "Papa criolla"],
        al: [],
        m: "o"
      },
      {
        id: "p302",
        n: "Desgranado Gourmet Típico",
        e: "🌽",
        c: "Especialidades",
        $: 26000,
        d: "Maíz tierno con pollo, carne, queso costeño, ripio y tártara.",
        i: ["Maíz tierno", "Pollo", "Carne", "Queso costeño", "Ripio", "Salsa tártara"],
        al: ["Lácteos", "Huevo"],
        m: "o"
      }
    ]
  },
  {
    id: 4,
    n: "Sushi Roll & Asian",
    e: "🍣",
    c: "Japonesa y fusión",
    r: "4.9",
    tm: "10-18 min",
    loc: "Local 12",
    t: 10,
    d: "Rollos de autor, bowls de poke frescos y bocados asiáticos de calidad.",
    P: [
      {
        id: "p401",
        n: "Philadelphia Roll (10 piezas)",
        e: "🍣",
        c: "Rolls",
        $: 31000,
        d: "Salmón fresco, queso crema y aguacate en ajonjolí tostado.",
        i: ["Salmón", "Queso crema", "Aguacate", "Ajonjolí", "Arroz"],
        al: ["Pescado", "Lácteos", "Ajonjolí"],
        m: "o"
      },
      {
        id: "p402",
        n: "Poke Bowl Salmón Teriyaki",
        e: "🥗",
        c: "Bowls",
        $: 33500,
        d: "Arroz sushi, salmón marinado, edamame, mango y salsa teriyaki.",
        i: ["Arroz sushi", "Salmón", "Edamame", "Mango", "Salsa teriyaki"],
        al: ["Pescado", "Soya"],
        m: "n"
      }
    ]
  }
];
