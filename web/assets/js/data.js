/* ============================================================
   مكتبة القبة — Catalog & sample data
   All content is local sample data for the storefront demo.
   ============================================================ */
window.DATA = (function () {
  const img = (n) => `assets/img/${n}`;

  /* ---------- Categories ---------- */
  const categories = [
    { id: "rewayat",  name: "روايات",       count: 120, icon: "book",     image: img("cat-literature.png") },
    { id: "tarikh",   name: "تاريخ",         count: 85,  icon: "landmark", image: img("cat-history.png") },
    { id: "adab",     name: "أدب",           count: 356, icon: "feather",  image: img("cat-card-2.png") },
    { id: "dini",     name: "ديني",          count: 64,  icon: "moon",     image: img("cat-card-1.png") },
    { id: "falsafa",  name: "فلسفة",         count: 42,  icon: "bulb",     image: img("cat-sciences.png") },
    { id: "shier",    name: "شعر",           count: 60,  icon: "feather",  image: img("cat-card-3.png") },
    { id: "ouloum",   name: "علوم",          count: 89,  icon: "atom",     image: img("cat-sciences.png") },
    { id: "atfal",    name: "أطفال",         count: 38,  icon: "smile",    image: img("cat-card-1.png") },
    { id: "thaqafa",  name: "ثقافة عامة",    count: 74,  icon: "grid",     image: img("cat-card-2.png") },
  ];

  /* ---------- Books ---------- */
  // cover keys reference assets/img/cover-*.png (real portrait covers from the design)
  const books = [
    { id:"b1",  title:"الأمير الصغير", author:"أنطوان دو سانت إكزوبيري", cat:"adab", catLabel:"أدب كلاسيكي",
      price:1200, old:1500, cover:"cover-4.png", gallery:["cover-4.png","thumb-5.png","thumb-6.png"],
      tags:["كلاسيكي","رواية"], rating:4.8, reviews:128, stock:32, publisher:"دار المعارف", pages:96, lang:"العربية", isNew:false,
      desc:"رواية شاعرية خالدة تروي لقاء طيارًا اضطر للهبوط في الصحراء بأميرٍ صغير قادم من كويكب بعيد. عبر حواراتهما، يتأمل الكتاب في البراءة والصداقة والمعاني التي يغفل عنها الكبار. عملٌ يلامس القلب في كل عمر ويُقرأ مراتٍ لا تُحصى.",
      desc2:"ترجمت هذه الطبعة الفاخرة بلغة عربية سلسة، وطُبعت على ورق فاخر بغلاف مقوّى. تُعدّ من أكثر الكتب مبيعًا وترجمةً في العالم، ومناسبة للهدايا وللمكتبة العائلية.",
      featured:true },

    { id:"b2",  title:"أولاد حارتنا", author:"نجيب محفوظ", cat:"rewayat", catLabel:"كلاسيكي",
      price:400, cover:"cover-15.png", tags:["كلاسيكي"], rating:4.6, reviews:210, stock:24, publisher:"دار الشروق", pages:540, lang:"العربية", isNew:false,
      desc:"رواية رمزية كبرى لنجيب محفوظ تستعيد حكاية الحارة لتطرح أسئلة السلطة والعدل والإيمان عبر أجيال متعاقبة. من أهم أعمال الأدب العربي الحديث." },

    { id:"b3",  title:"ذاكرة الجسد", author:"أحلام مستغانمي", cat:"rewayat", catLabel:"رومانسي",
      price:550, cover:"cover-9.png", tags:["رومانسي"], rating:4.5, reviews:186, stock:18, publisher:"دار الآداب", pages:384, lang:"العربية", isNew:true,
      desc:"رواية شاعرية تنسج ذاكرة الوطن والحب والفقد بأسلوبٍ أخّاذ، من أبرز أعمال الكاتبة الجزائرية أحلام مستغانمي." },

    { id:"b4",  title:"الفيل الأزرق", author:"أحمد مراد", cat:"rewayat", catLabel:"غموض",
      price:600, cover:"cover-3.png", tags:["غموض","إثارة"], rating:4.4, reviews:320, stock:12, publisher:"دار الشروق", pages:512, lang:"العربية", isNew:false,
      desc:"رواية إثارة نفسية تدور في قسم الطب النفسي الجنائي، حيث تتشابك الذاكرة والعقل والجريمة في حبكة مشوّقة." },

    { id:"b5",  title:"ثلاثية غرناطة", author:"رضوى عاشور", cat:"tarikh", catLabel:"تاريخي",
      price:450, old:550, cover:"cover-6.png", tags:["تاريخي"], rating:4.9, reviews:145, stock:9, publisher:"دار الآداب", pages:511, lang:"العربية", isNew:false,
      desc:"ثلاثية روائية تؤرخ لسقوط غرناطة ومعاناة عائلة مسلمة عبر أجيال، بلغة شاعرية ورؤية إنسانية عميقة." },

    { id:"b6",  title:"قوة العادات", author:"تشارلز دويج", cat:"thaqafa", catLabel:"تنمية بشرية",
      price:600, cover:"thumb-2.png", tags:["تطوير الذات"], rating:4.3, reviews:98, stock:40, publisher:"جرير", pages:376, lang:"العربية", isNew:true,
      desc:"كيف تتكوّن العادات ولماذا نكررها، وكيف يمكن تغييرها في الحياة والعمل. كتاب مرجعي في علم السلوك." },

    { id:"b7",  title:"مقدمة ابن خلدون", author:"ابن خلدون", cat:"tarikh", catLabel:"تاريخ وفلسفة",
      price:950, cover:"cover-12.png", tags:["كلاسيكي","فلسفة"], rating:4.9, reviews:260, stock:24, publisher:"دار المعارف", pages:720, lang:"العربية", isNew:false,
      desc:"أحد أعظم أعمال الفكر الإنساني، وأساس علم الاجتماع والعمران. دراسة في طبائع المجتمعات والدول والحضارات." },

    { id:"b8",  title:"ديوان المتنبي", author:"أبو الطيب المتنبي", cat:"shier", catLabel:"شعر",
      price:750, cover:"bundle-g.png", tags:["شعر","كلاسيكي"], rating:4.8, reviews:175, stock:5, publisher:"دار الفكر", pages:480, lang:"العربية", isNew:false,
      desc:"شاعر العربية الأكبر في ديوانه الكامل: حكمة وفخر وفلسفة في أروع صور البيان العربي." },

    { id:"b9",  title:"ظل الريح", author:"كارلوس زافون", cat:"rewayat", catLabel:"رواية عالمية",
      price:1000, cover:"cover-13.png", tags:["غموض","عالمي"], rating:4.7, reviews:410, stock:16, publisher:"دار مسكيلياني", pages:496, lang:"مترجم", isNew:true,
      desc:"في برشلونة ما بعد الحرب، يعثر صبي على كتاب ملعون يقوده إلى متاهة من الأسرار والحب والانتقام." },

    { id:"b10", title:"أصول الفقه وتطبيقاته المعاصرة", author:"د. وهبة الزحيلي", cat:"dini", catLabel:"العلوم الإسلامية",
      price:2200, old:2500, cover:"cover-1.png", tags:["فقه","أصول"], rating:4.8, reviews:64, stock:14, publisher:"دار الفكر", pages:820, lang:"العربية", isNew:true,
      desc:"مرجع شامل في أصول الفقه الإسلامي مع تطبيقاته على النوازل والقضايا المعاصرة." },

    { id:"b11", title:"مقدمة في الفلسفة الحديثة", author:"رينيه ديكارت", cat:"falsafa", catLabel:"الفلسفة",
      price:950, cover:"thumb-8.png", tags:["فلسفة"], rating:4.2, reviews:52, stock:20, publisher:"دار التنوير", pages:290, lang:"مترجم", isNew:true,
      desc:"مدخل إلى أسئلة المعرفة والوجود والمنهج، من ديكارت إلى الفلسفة الحديثة." },

    { id:"b12", title:"تاريخ شمال إفريقيا القديم", author:"د. محمد شفيق", cat:"tarikh", catLabel:"التاريخ والسياسة",
      price:1850, old:2100, cover:"cover-8.png", tags:["تاريخ"], rating:4.6, reviews:38, stock:11, publisher:"المركز الثقافي", pages:640, lang:"العربية", isNew:true,
      desc:"دراسة موثّقة لتاريخ شمال إفريقيا منذ العصور القديمة، بحضاراته وممالكه وتحولاته." },

    { id:"b13", title:"مختارات من الشعر العربي المعاصر", author:"أحمد عبد المعطي", cat:"shier", catLabel:"الأدب العربي",
      price:1200, cover:"thumb-3.png", tags:["شعر"], rating:4.4, reviews:29, stock:26, publisher:"دار الآداب", pages:340, lang:"العربية", isNew:true,
      desc:"أنطولوجيا جامعة لأبرز أصوات الشعر العربي المعاصر وقصائده المؤسسة." },

    { id:"b14", title:"تاريخ الجزائر الثقافي", author:"د. عبد الرحمن الجيلالي", cat:"tarikh", catLabel:"تاريخ الجزائر",
      price:2450, old:3000, cover:"banner-month.png", tags:["تاريخ","الجزائر"], rating:4.9, reviews:73, stock:7, publisher:"دار الحكمة", pages:900, lang:"العربية", isNew:true, monthPick:true,
      desc:"دراسة تحليلية معمّقة للحياة الثقافية في الجزائر عبر العصور، من أهم مراجع التاريخ الثقافي الوطني." },

    { id:"b15", title:"النبي", author:"جبران خليل جبران", cat:"adab", catLabel:"أدب",
      price:800, cover:"cover-10.png", tags:["أدب","كلاسيكي"], rating:4.8, reviews:520, stock:30, publisher:"دار المعارف", pages:128, lang:"العربية", isNew:false,
      desc:"نصوص شاعرية خالدة عن الحب والعمل والحرية، من روائع الأدب الإنساني." },

    { id:"b16", title:"1984", author:"جورج أورويل", cat:"rewayat", catLabel:"ديستوبيا",
      price:1100, cover:"bundle-b.png", tags:["عالمي","ديستوبيا"], rating:4.7, reviews:640, stock:22, publisher:"دار مسكيلياني", pages:376, lang:"مترجم", isNew:false,
      desc:"رواية ديستوبية كبرى عن الرقابة والحرية والحقيقة، من أشهر أعمال القرن العشرين." },

    { id:"b17", title:"مائة عام من العزلة", author:"غابرييل غارثيا ماركيث", cat:"rewayat", catLabel:"عالمي",
      price:1400, cover:"cover-7.png", tags:["عالمي","واقعية سحرية"], rating:4.9, reviews:480, stock:13, publisher:"دار التنوير", pages:472, lang:"مترجم", isNew:false,
      desc:"ملحظة عائلة بوينديا ومدينة ماكوندو الخيالية، وتحفة الواقعية السحرية الأشهر عالميًا." },

    { id:"b18", title:"الخيميائي", author:"باولو كويلو", cat:"rewayat", catLabel:"عالمي",
      price:950, cover:"bundle-e.png", tags:["عالمي","رحلة"], rating:4.5, reviews:720, stock:35, publisher:"دار مسكيلياني", pages:208, lang:"مترجم", isNew:false,
      desc:"رحلة الراعي الأندلسي بحثًا عن كنزه وحلمه، ورمز السعي وراء الأسطورة الشخصية." },

    { id:"b19", title:"رسالة الغفران", author:"أبو العلاء المعري", cat:"falsafa", catLabel:"أدب وفلسفة",
      price:1800, cover:"thumb-6.png", tags:["كلاسيكي","فلسفة"], rating:4.6, reviews:41, stock:0, publisher:"دار المعارف", pages:430, lang:"العربية", isNew:false,
      desc:"رحلة خيالية في الجنة والنار تمتزج فيها الفلسفة بالشعر والنقد، من عيون الأدب العربي." },

    { id:"b20", title:"نجمة", author:"كاتب ياسين", cat:"adab", catLabel:"رواية جزائرية",
      price:1200, cover:"cat-card-1.png", tags:["جزائري"], rating:4.7, reviews:88, stock:15, publisher:"دار الآداب", pages:300, lang:"مترجم", isNew:false,
      desc:"أيقونة الرواية الجزائرية الحديثة، ورحلة بحث عن الهوية عبر شخصية نجمة الأسطورية." },

    { id:"b21", title:"اللاز", author:"الطاهر وطار", cat:"adab", catLabel:"رواية جزائرية",
      price:1100, cover:"thumb-1.png", tags:["جزائري"], rating:4.5, reviews:66, stock:17, publisher:"دار الحكمة", pages:256, lang:"العربية", isNew:false,
      desc:"رواية رائدة تتناول التحولات الاجتماعية في الريف الجزائري بلغة سردية متميزة." },

    { id:"b22", title:"ريح الجنوب", author:"عبد الحميد بن هدوقة", cat:"adab", catLabel:"رواية جزائرية",
      price:900, cover:"thumb-5.png", tags:["جزائري"], rating:4.4, reviews:54, stock:19, publisher:"دار الحكمة", pages:232, lang:"العربية", isNew:false,
      desc:"من كلاسيكيات الرواية الجزائرية، تصوّر صراع القيم في قرية جزائرية بعد الاستقلال." },

    { id:"b23", title:"مقدمة في علم الاجتماع", author:"د. مصطفى حجازي", cat:"ouloum", catLabel:"علوم إنسانية",
      price:1300, cover:"cat-card-3.png", tags:["علوم"], rating:4.3, reviews:35, stock:23, publisher:"المركز الثقافي", pages:360, lang:"العربية", isNew:false,
      desc:"مدخل منهجي لفهم المجتمع والظواهر الاجتماعية وأدوات تحليلها." },

    { id:"b24", title:"قصص الأنبياء للأطفال", author:"سارة أحمد", cat:"atfal", catLabel:"أطفال",
      price:850, cover:"bundle-f.png", tags:["أطفال","ديني"], rating:4.8, reviews:120, stock:44, publisher:"دار المعارف", pages:160, lang:"العربية", isNew:true,
      desc:"نسخة مبسّطة ومصوّرة من قصص الأنبياء، بأسلوبٍ يناسب الأطفال ويحبّبهم في القراءة." },
  ];

  books.forEach(b => { b.coverUrl = img(b.cover); });

  /* ---------- Bundles ---------- */
  const bundles = [
    { id:"pk1", name:"باقة الأدب الجزائري", count:4, price:3800, old:4500, save:15, active:true,
      covers:["cover-3.png","cover-9.png","cover-8.png"], bookIds:["b20","b21","b3","b22"],
      desc:"أربع روايات جزائرية خالدة تجمع أجيال السرد الجزائري من كاتب ياسين إلى أحلام مستغانمي." },
    { id:"pk2", name:"باقة الفلسفة الحديثة", count:3, price:4160, old:5200, save:20, active:true,
      covers:["cover-1.png","cover-13.png","cover-10.png"], bookIds:["b11","b19","b15"],
      desc:"مدخل إلى الفكر الفلسفي الحديث عبر ثلاثة أعمال تأسيسية." },
    { id:"pk3", name:"مكتبة التاريخ الإسلامي", count:5, price:2500, old:3600, save:30, active:true, featured:true,
      covers:["cover-12.png","banner-month.png","cover-8.png"], bookIds:["b7","b12","b14"],
      desc:"مجموعة مختارة من أهم مراجع التاريخ الإسلامي والحضارة." },
    { id:"pk4", name:"مجموعة الروايات الحديثة", count:4, price:1200, old:2000, save:15, active:true, featured:true,
      covers:["cover-13.png","cover-3.png","cover-4.png"], bookIds:["b16","b17","b18"],
      desc:"أشهر الروايات العالمية المعاصرة في باقة واحدة بسعرٍ مخفّض." },
    { id:"pk5", name:"باقة الأدب الكلاسيكي", count:3, price:1500, old:2000, save:25, active:true, featured:true,
      covers:["cover-10.png","cover-15.png","cover-9.png"], bookIds:["b15","b2","b1"],
      desc:"روائع الأدب الكلاسيكي العربي والعالمي مختارة بعناية." },
    { id:"pk6", name:"باقة روايات الخيال", count:3, price:2700, old:3200, save:15, active:false,
      covers:["cover-4.png","cover-9.png","cover-6.png"], bookIds:["b9","b3","b5"],
      desc:"رحلات إلى عوالم الخيال والغموض مع ثلاث روايات مشوّقة." },
    { id:"pk7", name:"تاريخ وحضارة", count:5, price:4800, old:6000, save:20, active:true,
      covers:["banner-month.png","cover-8.png","cover-12.png"], bookIds:["b14","b12","b7"],
      desc:"خمسة مراجع في التاريخ والحضارة الإنسانية والإسلامية." },
  ];

  /* ---------- Orders (dashboard sample) ---------- */
  const orders = [
    { id:"ORD-001", ref:"#ORD-001", name:"أحمد بن علي", phone:"0555 12 34 56", wilaya:"الجزائر", total:4500, status:"new", date:"12 أكتوبر 2023" },
    { id:"ORD-002", ref:"#ORD-002", name:"فاطمة الزهراء", phone:"0770 98 76 54", wilaya:"وهران", total:12200, status:"proc", date:"11 أكتوبر 2023" },
    { id:"ORD-003", ref:"#ORD-003", name:"ياسين محمود", phone:"0661 22 33 44", wilaya:"قسنطينة", total:3800, status:"done", date:"10 أكتوبر 2023" },
    { id:"ORD-004", ref:"#ORD-004", name:"سميرة قدور", phone:"0552 44 55 66", wilaya:"عنابة", total:7100, status:"cancel", date:"09 أكتوبر 2023" },
  ];

  const recentOrders = [
    { ref:"#KB-5432", name:"أحمد محمد", total:3500, status:"done" },
    { ref:"#KB-5431", name:"سارة خالد", total:1200, status:"proc" },
    { ref:"#KB-5430", name:"عمر يوسف", total:5700, status:"done" },
  ];

  // Detailed order for the "order details" view
  const orderDetail = {
    ref:"#ORD-2023-089", status:"proc", date:"15 أكتوبر 2023، 14:30",
    customer:{ name:"أحمد بن صالح", phone:"0555 12 34 56", wilaya:"الجزائر العاصمة (16)",
      address:"حي 5 جويلية، عمارة ب، رقم 14، باب الزوار", note:"الرجاء التوصيل بعد الساعة 4 مساءً، شكراً." },
    items:[
      { title:"مقدمة ابن خلدون", cat:"التاريخ والفلسفة", cover:"thumb-1.png", qty:2, price:2400, sub:4800 },
      { title:"ديوان المتنبي", cat:"الشعر والأدب", cover:"thumb-2.png", qty:1, price:1800, sub:1800 },
    ],
    subtotal:6600, shipping:400, total:7000
  };

  /* ---------- Dashboard stats ---------- */
  const stats = [
    { label:"مبيعات هذا الشهر", value:"45,000", unit:"د.ج", icon:"chart", tone:"g" },
    { label:"كتب قاربت على النفاد", value:"8", unit:"", icon:"alert", tone:"r", danger:true },
    { label:"طلبات جديدة", value:"15", unit:"", icon:"cart", tone:"b" },
    { label:"عدد الكتب", value:"1,240", unit:"", icon:"book", tone:"g" },
  ];
  const salesChart = [
    { day:"الأحد", v:8 }, { day:"الإثنين", v:12 }, { day:"الثلاثاء", v:6 },
    { day:"الأربعاء", v:15 }, { day:"الخميس", v:10 }, { day:"الجمعة", v:18 }, { day:"السبت", v:13 },
  ];

  /* ---------- Shipping / wilayas ---------- */
  const wilayas = [
    { name:"أدرار", home:1400, office:970 },
    { name:"الشلف", home:850, office:520 },
    { name:"الأغواط", home:950, office:650 },
    { name:"أم البواقي", home:850, office:520 },
    { name:"باتنة", home:900, office:520 },
    { name:"بجاية", home:800, office:520 },
    { name:"الجزائر", home:500, office:370, capital:true },
    { name:"تمنراست", home:1600, office:1120 },
    { name:"وهران", home:800, office:520 },
    { name:"قسنطينة", home:800, office:520 },
  ];
  // Full 58-wilaya list (names) for the checkout dropdown
  const allWilayas = ["أدرار","الشلف","الأغواط","أم البواقي","باتنة","بجاية","بسكرة","بشار","البليدة","البويرة","تمنراست","تبسة","تلمسان","تيارت","تيزي وزو","الجزائر","الجلفة","جيجل","سطيف","سعيدة","سكيكدة","سيدي بلعباس","عنابة","قالمة","قسنطينة","المدية","مستغانم","المسيلة","معسكر","ورقلة","وهران","البيض","إليزي","برج بوعريريج","بومرداس","الطارف","تندوف","تيسمسيلت","الوادي","خنشلة","سوق أهراس","تيبازة","ميلة","عين الدفلى","النعامة","عين تموشنت","غرداية","غليزان","تيميمون","برج باجي مختار","أولاد جلال","بني عباس","عين صالح","عين قزام","توقرت","جانت","المغير","المنيعة"];

  /* ---------- Store settings ---------- */
  const settings = {
    name:"Kouba Book Store",
    nameAr:"مكتبة القبة",
    desc:"أفضل مكتبة لبيع الكتب في الجزائر.",
    phone:"0555 12 34 56",
    whatsapp:"0555 12 34 56",
    email:"contact@koubabookstore.dz",
    address:"شارع الاستقلال، القبة، الجزائر العاصمة",
    adminEmail:"admin@koubabookstore.dz",
    shipRows:[
      { name:"الجزائر", eta:"24 - 48 ساعة" },
      { name:"وهران", eta:"3 - 5 أيام" },
      { name:"قسنطينة", eta:"3 - 5 أيام" },
    ]
  };

  return { img, categories, books, bundles, orders, recentOrders, orderDetail, stats, salesChart, wilayas, allWilayas, settings };
})();
