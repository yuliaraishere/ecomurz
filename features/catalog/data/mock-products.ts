import type { Product } from '../domain/product';

export const mockProducts: Product[] = [
  {
    id: 'ayam-kampung-segar',
    category: 'Daging & Unggas',
    price: 680,
    rating: 4.9,
    reviews: 142,
    stock: 25,
    image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=1200&q=85',
    accent: '#c2785c',
    localizedContent: {
      id: {
        name: 'Ayam Kampung Segar',
        description: 'Ayam kampung utuh segar pilihan dengan daging padat, rendah lemak, dan cita rasa gurih alami. Bersih siap olah untuk opor, sup, atau ayam goreng.',
      },
      en: {
        name: 'Fresh Free-Range Chicken',
        description: 'Fresh whole free-range chicken with lean, tender meat and rich natural flavor. Cleaned and ready for roasting, curries, or traditional chicken soup.',
      },
      ja: {
        name: '新鮮な地鶏（丸鶏）',
        description: '引き締まった肉質と豊かなコクが特徴の新鮮な放し飼い地鶏（丸鶏）。ロースト、スープ、カレーなど本格煮込み料理に最適です。',
      },
      tl: {
        name: 'Sariwang Katutubong Manok',
        description: 'Sariwa at buong katutubong manok na may siksik na laman at likas na linamnam. Malinis at handang lutuin para sa tinola, adobo, o sabaw.',
      },
      vi: {
        name: 'Gà Ta Thả Vườn Tươi',
        description: 'Gà ta thả vườn nguyên con tươi ngon, thịt chắc ngọt, ít mỡ và đậm đà tự nhiên. Đã làm sạch, lý tưởng cho món gà luộc, nấu cháo hoặc cà ri.',
      },
      th: {
        name: 'ไก่บ้านสดทั้งตัว',
        description: 'ไก่บ้านสดทั้งตัวเนื้อแน่น ไขมันต่ำ ให้รสชาติหวานอร่อยตามธรรมชาติ ล้างสะอาดพร้อมปรุงสำหรับต้มยำ ไก่ทอด หรือแกงรสเด็ด',
      },
      hi: {
        name: 'ताज़ा देसी मुर्गा (साबुत)',
        description: 'ताज़ा साबुत देसी चिकन, पौष्टिक, कम वसा और प्राकृतिक स्वाद से भरपूर। करी, सूप या रोस्टिंग के लिए साफ और तैयार।',
      },
      zh: {
        name: '新鲜优质走地鸡（整只）',
        description: '精选新鲜散养走地鸡，肉质紧实细嫩，脂肪低且鲜香浓郁。已彻底清洗净膛，适宜煲汤、白斩或咖喱炖煮。',
      },
    },
  },
  {
    id: 'paha-ayam-fillet',
    category: 'Daging & Unggas',
    price: 450,
    rating: 4.8,
    reviews: 98,
    stock: 30,
    image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=1200&q=85',
    accent: '#d48b72',
    localizedContent: {
      id: {
        name: 'Paha Ayam Fillet Tanpa Tulang',
        description: 'Potongan daging paha ayam segar tanpa tulang dan kulit (500g). Daging juicy dan lembut, sempurna untuk sate, katsu, tumisan, atau barbeque.',
      },
      en: {
        name: 'Boneless Chicken Thigh Fillet',
        description: 'Fresh boneless, skinless chicken thigh fillets (500g). Juicy, flavorful, and versatile for yakitori, katsu, stir-fries, or grilling.',
      },
      ja: {
        name: '鶏もも肉（骨なしフィレ）',
        description: 'ジューシーで柔らかい骨なし・皮なし鶏もも肉フィレ（500g）。焼き鳥、チキンカツ、炒め物やグリルにぴったりです。',
      },
      tl: {
        name: 'Boneless Chicken Thigh Fillet',
        description: 'Sariwang fillet ng hita ng manok na walang buto (500g). Makatas at malambot, perpekto para sa inasal, stir-fry, o pritong katsu.',
      },
      vi: {
        name: 'Đùi Gà Rút Xương Tươi',
        description: 'Thịt đùi gà tươi rút xương, bỏ da (500g). Mềm ngọt và mọng nước, lý tưởng cho món xào, áp chảo, xiên que nướng hoặc gà rán.',
      },
      th: {
        name: 'สะโพกไก่เลาะกระดูก',
        description: 'เนื้อสะโพกไก่สดเลาะกระดูกและลอกหนัง (500 กรัม) เนื้อนุ่มฉ่ำ เหมาะสำหรับทำไก่ย่าง ผัด หรือทอดกรอบ',
      },
      hi: {
        name: 'हड्डी रहित चिकन थाई फ़िलेट',
        description: 'ताज़ा हड्डी रहित और बिना त्वचा वाला चिकन थाई फ़िलेट (500 ग्राम)। रसदार और कोमल, बारबेक्यू, कबाब या स्टिर-फ्राई के लिए उत्तम।',
      },
      zh: {
        name: '鲜嫩去骨鸡腿肉排',
        description: '精选新鲜去骨去皮鸡腿肉（500克）。鲜嫩多汁，口感紧致，非常适合制作照烧鸡排、日式炸鸡、串烧或快炒。',
      },
    },
  },
  {
    id: 'baby-pakcoy-segar',
    category: 'Sayuran Segar',
    price: 120,
    rating: 4.9,
    reviews: 215,
    stock: 40,
    image: 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?auto=format&fit=crop&w=1200&q=85',
    accent: '#4a7c59',
    localizedContent: {
      id: {
        name: 'Baby Pakcoy Hidroponik Segar',
        description: 'Baby pakcoy hijau renyah dan segar (250g). Ditanam secara hidroponik tanpa pestisida berbahaya, sangat cocok ditumis saus tiram atau rebusan kuah kaldu.',
      },
      en: {
        name: 'Fresh Hydroponic Baby Bok Choy',
        description: 'Crisp, sweet, and vibrant baby bok choy (250g). Organically cultivated, tender leaves and crunchy stems perfect for garlic stir-fries or noodle soups.',
      },
      ja: {
        name: '新鮮ベビーチンゲンサイ（青梗菜）',
        description: 'みずみずしく甘みのあるシャキシャキのベビーチンゲンサイ（250g）。ニンニク炒めやスープ、ラーメンの具材に最高です。',
      },
      tl: {
        name: 'Sariwang Baby Bok Choy (Pechay)',
        description: 'Malutong at sariwang baby bok choy (250g). Mainam igisa sa bawang at oyster sauce o ihalo sa paboritong sabaw at mami.',
      },
      vi: {
        name: 'Cải Thìa (Bok Choy) Non Tươi',
        description: 'Cải thìa non xanh giòn ngọt tự nhiên (250g). Thích hợp xào tỏi sốt dầu hào, nấu canh thanh mát hoặc ăn kèm lẩu.',
      },
      th: {
        name: 'ผักกวางตุ้งไต้หวันสด (เบบี้บ็อกฉอย)',
        description: 'เบบี้บ็อกฉอยสดหวานกรอบ (250 กรัม) ใบเขียวสด ก้านกรอบอร่อย เหมาะสำหรับผัดน้ำมันหอยหรือใส่ในก๋วยเตี๋ยวร้อนๆ',
      },
      hi: {
        name: 'ताज़ा बेबी बोक चॉय',
        description: 'कुरकुरा, मीठा और हरा-भरा ताज़ा बेबी बोक चॉय (250 ग्राम)। लहसुन के साथ स्टिर-फ्राई या नूडल सूप के लिए एकदम सही।',
      },
      zh: {
        name: '新鲜水培小油菜（上海青）',
        description: '鲜嫩爽脆的高品质水培嫩油菜（250克）。清甜无涩味，叶嫩梗脆，适合清炒、蚝油蒜蓉烹调或下火锅配菜。',
      },
    },
  },
  {
    id: 'kangkung-hidroponik',
    category: 'Sayuran Segar',
    price: 98,
    rating: 4.8,
    reviews: 178,
    stock: 35,
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=85',
    accent: '#3f6b4d',
    localizedContent: {
      id: {
        name: 'Kangkung Segar Hidroponik',
        description: 'Sayur kangkung air hidroponik pilihan (300g) dengan batang renyah dan daun hijau muda segar. Lezat dimasak plecing, tumis terasi, atau cah tauco.',
      },
      en: {
        name: 'Fresh Water Spinach (Kangkung)',
        description: 'Tender and crunchy water spinach / morning glory (300g). Hydroponically grown, ideal for spicy sambal or garlic stir-fries.',
      },
      ja: {
        name: '空心菜（クウシンサイ）',
        description: 'シャキッとした茎と柔らかな葉が美味しい新鮮な空心菜（300g）。中華風ガーリック炒めやエスニック炒めに欠かせない定番野菜です。',
      },
      tl: {
        name: 'Sariwang Kangkong',
        description: 'Sariwa at malulutong na kangkong (300g). Paboritong lahok sa sinigang, ginisang kangkong sa bagoong, o adobong kangkong.',
      },
      vi: {
        name: 'Rau Muống Nước Tươi Sạch',
        description: 'Rau muống tươi giòn ngọt tự nhiên (300g). Hoàn hảo cho món rau muống xào tỏi thơm lừng, luộc chấm tương hoặc ăn kèm bún.',
      },
      th: {
        name: 'ผักบุ้งจีนสด',
        description: 'ผักบุ้งจีนยอดอ่อนสดกรอบ (300 กรัม) ยอดอ่อนกรุบกรอบ เมนูยอดนิยมสำหรับผัดผักบุ้งไฟแดงหรือใส่ในสุกี้',
      },
      hi: {
        name: 'ताज़ा जल पालक (कांगकुंग)',
        description: 'कोमल और कुरकुरी जल पालक (300 ग्राम)। तीखे मसालों, लहसुन या दाल के साथ स्वादिष्ट भाजी बनाने के लिए आदर्श।',
      },
      zh: {
        name: '新鲜爽脆空心菜',
        description: '精选水培鲜嫩空心菜（300克）。茎嫩脆口，叶片碧绿，最宜大火爆炒虾酱空心菜、蒜蓉清炒或作为汤品涮菜。',
      },
    },
  },
  {
    id: 'cabai-rawit-merah',
    category: 'Bumbu & Rempah',
    price: 240,
    rating: 4.9,
    reviews: 320,
    stock: 50,
    image: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=1200&q=85',
    accent: '#d63b2f',
    localizedContent: {
      id: {
        name: 'Cabai Rawit Merah Petik Segar',
        description: 'Cabai rawit merah segar kualitas premium (200g) dengan tingkat kepedasan maksimal dan aroma segar. Cocok untuk aneka sambal Nusantara dan masakan pedas.',
      },
      en: {
        name: "Fresh Red Bird's Eye Chilies",
        description: "Fiery and aromatic fresh red bird's eye chilies (200g). Delivers clean, intense heat for traditional sambals, Thai curry pastes, and spicy condiments.",
      },
      ja: {
        name: '生赤唐辛子（バードアイチリ）',
        description: '強烈な辛味と鮮やかな赤色が特徴の生赤唐辛子（200g）。手作りサンバル、トムヤムクン、激辛アジア料理に本格的な辛さを添えます。',
      },
      tl: {
        name: 'Sariwang Pulang Siling Labuyo',
        description: 'Napakanghang at sariwang pulang siling labuyo (200g). Pampaanghang sa sawsawan, sinigang, sisig, at paboritong lutuing maanghang.',
      },
      vi: {
        name: 'Ớt Hiểm Đỏ Tươi Cay Nồng',
        description: 'Ớt hiểm đỏ tươi chọn lọc (200g), cay nồng và thơm lừng đặc trưng. Dùng pha nước mắm chấm, làm sa tế hoặc kho thịt cá.',
      },
      th: {
        name: 'พริกขี้หนูแดงสด',
        description: 'พริกขี้หนูสวนสีแดงสดรสเผ็ดจัดจ้าน (200 กรัม) กลิ่นหอมเผ็ดร้อน สำหรับตำน้ำพริก ต้มยำ หรือทำพริกน้ำปลา',
      },
      hi: {
        name: 'ताज़ी लाल तीखी मिर्च (बर्ड्स आई)',
        description: 'तीखी और सुगंधित ताज़ी लाल मिर्च (200 ग्राम)। चटनी, सांभर और पारंपरिक व्यंजनों में असली तीखापन जोड़ने के लिए उपयुक्त।',
      },
      zh: {
        name: '新鲜朝天红指天椒',
        description: '精选朝天红指天椒（200克）。色泽鲜红艳丽，辣度强劲过瘾，香气纯正，是调制辣酱、佐料及麻辣料理的绝佳良品。',
      },
    },
  },
  {
    id: 'bumbu-rendang-otentik',
    category: 'Bumbu & Rempah',
    price: 180,
    rating: 5.0,
    reviews: 410,
    stock: 45,
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1200&q=85',
    accent: '#a65329',
    localizedContent: {
      id: {
        name: 'Bumbu Rendang Padang Otentik',
        description: 'Pasta bumbu rendang basah tradisional Minang (150g). Diramu dari rempah asli seperti serai, laos, cabai, dan rempah pilihan tanpa pengawet buatan.',
      },
      en: {
        name: 'Authentic Rendang Curry Spice Paste',
        description: 'Traditional slow-simmered Indonesian Rendang spice paste (150g). Crafted with real lemongrass, galangal, chilies, and whole spices with zero artificial preservatives.',
      },
      ja: {
        name: '本格ルンダン カレーペースト',
        description: '本場インドネシア・ミナンカバウ伝統の濃厚ルンダンペースト（150g）。レモングラス、ガランガル、厳選スパイスを贅沢に調合。無添加。',
      },
      tl: {
        name: 'Otentikong Rendang Curry Paste',
        description: 'Tradisyunal na timpla ng rendang curry paste (150g). Gawa sa sariwang tanglad, langkawas, sili, at natural na pampalasa nang walang preservatives.',
      },
      vi: {
        name: 'Gói Sốt Gia Vị Rendang Truyền Thống',
        description: 'Sốt gia vị cà ri Rendang đậm đà chuẩn vị truyền thống (150g). Kết hợp sả, riềng, ớt và thảo mộc tự nhiên, giúp nấu món bò hoặc gà rendang thơm ngon.',
      },
      th: {
        name: 'เครื่องแกงเรินดังแท้',
        description: 'พริกแกงเรินดังสูตรต้นตำรับอินโดนีเซีย (150 กรัม) ปรุงจากตะไคร้ ข่า พริก และเครื่องเทศหอมกรุ่น ปราศจากวัตถุกันเสีย',
      },
      hi: {
        name: 'प्रामाणिक रेंडांग मसाला पेस्ट',
        description: 'पारंपरिक धीमी गति से पकाई गई रेंडांग मसाला पेस्ट (150 ग्राम)। लेमनग्रास, अदरक, मिर्च और साबुत मसालों का समृद्ध मिश्रण। कृत्रिम संरक्षक मुक्त।',
      },
      zh: {
        name: '地道仁当咖喱香料酱',
        description: '印尼米南加保正宗仁当咖喱酱（150克）。融合天然香茅、南姜、红椒及十余种芳香辛香料慢熬而成，无防腐剂，香气醇厚浓郁。',
      },
    },
  },
  {
    id: 'trio-rimpang-segar',
    category: 'Bumbu & Rempah',
    price: 150,
    rating: 4.8,
    reviews: 86,
    stock: 38,
    image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=1200&q=85',
    accent: '#c7943e',
    localizedContent: {
      id: {
        name: 'Trio Rimpang Dapur: Jahe, Lengkuas & Kunyit',
        description: 'Paket lengkap rimpang aromatik segar (300g) terdiri dari jahe emprit, lengkuas merah, dan kunyit tua. Bumbu dasar wajib untuk soto, opor, dan jamu.',
      },
      en: {
        name: 'Fresh Ginger, Galangal & Turmeric Trio',
        description: 'Fresh Asian aromatics bundle (300g) featuring fresh ginger root, galangal, and mature turmeric. The essential culinary foundation for Asian curries, soups, and teas.',
      },
      ja: {
        name: '新鮮生姜・ガランガル・ウコン 3種セット',
        description: 'アジアン料理に欠かせない新鮮な根生姜、ガランガル、生ウコンの厳選3種パック（300g）。スープや煮込み、健康茶の風味づけに。',
      },
      tl: {
        name: 'Sariwang Luya, Langkawas at Luyang Dilaw',
        description: 'Kumbinasyon ng sariwang pampalasa (300g): luya, langkawas (galangal), at luyang dilaw (turmeric). Mahalagang sangkap sa mga sabaw, kari, at inumin.',
      },
      vi: {
        name: 'Bộ Ba Củ Gừng, Riềng & Nghệ Tươi',
        description: 'Bộ ba gia vị thảo mộc tươi (300g) gồm gừng thơm, củ riềng cay nồng và nghệ vàng tươi. Gia vị gốc không thể thiếu cho các món kho, canh, lẩu.',
      },
      th: {
        name: 'ชุดขิง ข่า ขมิ้นสด',
        description: 'ชุดเครื่องต้มยำสมุนไพรสด (300 กรัม) ประกอบด้วยขิงสด ข่าแก่ และขมิ้นชัน วัตถุดิบพื้นฐานสำหรับแกงและต้มยำ',
      },
      hi: {
        name: 'ताज़ा अदरक, कुलंजन और हल्दी पैक',
        description: 'ताज़ा एशियाई सुगंधित कॉम्बो (300 ग्राम): अदरक, कुलंजन (गालंगल) और ताज़ी हल्दी। करी, चाय और स्वास्थ्यवर्धक पेय के लिए आवश्यक।',
      },
      zh: {
        name: '新鲜生姜、高良姜与姜黄鲜芳包',
        description: '精选新鲜厨房芳香根茎三合一组合（300克）：老生姜、红南姜与熟黄姜。亚洲炖汤、卤肉、咖喱及养生饮品不可或缺的灵魂基底。',
      },
    },
  },
  {
    id: 'kecap-manis-kedelai-hitam',
    category: 'Bahan Pokok',
    price: 280,
    rating: 4.9,
    reviews: 265,
    stock: 40,
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1200&q=85',
    accent: '#2c2621',
    localizedContent: {
      id: {
        name: 'Kecap Manis Tradisional Kedelai Hitam',
        description: 'Kecap manis kental legiti hasil fermentasi alami kedelai hitam pilihan dan gula kelapa murni (600ml). Bumbu kunci nasi goreng, sate, dan tumisan khas Nusantara.',
      },
      en: {
        name: 'Traditional Sweet Soy Sauce (Kecap Manis)',
        description: 'Thick, rich, and aromatic sweet soy sauce naturally fermented from black soybeans and pure coconut palm sugar (600ml). Crucial for fried rice, satay, and glazing.',
      },
      ja: {
        name: '伝統の甘口醤油（ケチャップマニス）',
        description: '黒大豆の天然発酵とパームシュガーから作られた濃厚でコク深いインドネシア甘口醤油（600ml）。ナシゴレンや焼き鳥タレに必須。',
      },
      tl: {
        name: 'Tradisyunal na Sweet Soy Sauce (Kecap Manis)',
        description: 'Malapot, matamis, at malasang toyo mula sa itim na toyo at asukal ng niyog (600ml). Paboritong sarsa sa fried rice, barbecue, at pritong ulam.',
      },
      vi: {
        name: 'Nước Tương Ngọt Đậm Đặc (Kecap Manis)',
        description: 'Nước tương ngọt truyền thống sánh đậm lên men từ đậu tương đen và đường thốt nốt (600ml). Gia vị tuyệt hảo cho cơm chiên, thịt nướng và món xào.',
      },
      th: {
        name: 'ซีอิ๊วหวานสูตรโบราณ (เคจับ มานิส)',
        description: 'ซีอิ๊วหวานสูตรดั้งเดิมเนื้อเข้มข้น ผลิตจากถั่วเหลืองดำและน้ำตาลมะพร้าวแท้ (600 มล.) สำหรับข้าวผัด ไก่ย่าง และเมนูผัดรสกลมกล่อม',
      },
      hi: {
        name: 'पारंपरिक मीठी सोया सॉस (केकैप मैनिस)',
        description: 'काले सोयाबीन और नारियल के गुड़ से प्राकृतिक रूप से तैयार की गई गाढ़ी मीठी सोया सॉस (600 मिली)। फ्राइड राइस और कबाब के लिए लाजवाब।',
      },
      zh: {
        name: '传统特酿黑豆甜酱油（印尼Kecap Manis）',
        description: '传统天然发酵黑大豆结合纯正椰糖慢火熬制的醇厚甜酱油（600毫升）。质地浓稠、色泽红亮，是印尼炒饭、沙爹烤肉及红烧快炒的调味神器。',
      },
    },
  },
  {
    id: 'bumbu-soto-ayam-kuning',
    category: 'Bumbu & Rempah',
    price: 160,
    rating: 4.9,
    reviews: 154,
    stock: 50,
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1200&q=85',
    accent: '#e6a122',
    localizedContent: {
      id: {
        name: 'Bumbu Soto Ayam Kuning Tradisional',
        description: 'Pasta bumbu soto ayam kuning siap pakai (100g) dengan racikan rempah kunyit, serai, daun jeruk, dan bawang alami. Gurih segar dan harum menggugah selera.',
      },
      en: {
        name: 'Traditional Yellow Chicken Soto Spice Paste',
        description: 'Ready-to-cook aromatic yellow chicken soto broth paste (100g) crafted with fresh turmeric, lemongrass, kaffir lime leaves, and garlic. Rich and comforting.',
      },
      ja: {
        name: '伝統のソトアヤム スパイスペースト',
        description: 'ウコン、レモングラス、コブミカンの葉を贅沢にブレンドした本格インドネシア風チキンスープ（ソトアヤム）の素（100g）。香り高く滋味深い味わい。',
      },
      tl: {
        name: 'Tradisyunal na Soto Ayam Spice Paste',
        description: 'Handa nang lutuing dilaw na pampalasa ng sopas na manok (100g) na gawa sa sariwang luyang-dilaw, tanglad, at dahon ng dayap. Masarap at pampalakas.',
      },
      vi: {
        name: 'Gói Gia Vị Nấu Súp Gà Soto Vàng',
        description: 'Sốt gia vị súp gà Soto vàng thơm ngon (100g) chiết xuất từ nghệ tươi, sả, lá chanh kaffir và hành tỏi tự nhiên. Đậm đà, thanh mát và thơm lừng.',
      },
      th: {
        name: 'เครื่องปรุงซุปไก่โซโต อายัม สูตรดั้งเดิม',
        description: 'พริกแกงสำหรับต้มซุปไก่ขมิ้นสไตล์อินโดนีเซีย (100 กรัม) หอมกลิ่นขมิ้น ตะไคร้ และใบมะกรูดแท้ ให้รสชาติกลมกล่อมสดชื่น',
      },
      hi: {
        name: 'पारंपरिक सोटो अयाम चिकन सूप मसाला पेस्ट',
        description: 'ताज़ा हल्दी, लेमनग्रास और कैफ़िर लाइम पत्तियों से बना स्वादिष्ट पारंपरिक चिकन सूप मसाला पेस्ट (100 ग्राम)। स्फूर्तिदायक और सुगंधित।',
      },
      zh: {
        name: '传统黄姜鸡汤香料膏（印尼Soto Ayam）',
        description: '地道印尼黄姜鸡汤料包（100克），精选优质生鲜黄姜、香茅、柠檬叶与大蒜熬制，汤色金黄澄澈，香气四溢，鲜美开胃。',
      },
    },
  },
  {
    id: 'bumbu-nasi-goreng-spesial',
    category: 'Bumbu & Rempah',
    price: 150,
    rating: 4.8,
    reviews: 210,
    stock: 45,
    image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=85',
    accent: '#c44929',
    localizedContent: {
      id: {
        name: 'Bumbu Nasi Goreng Spesial Nusantara',
        description: 'Pasta bumbu nasi goreng racikan khas Nusantara (120g) dengan terasi udang sangrai, bawang merah, cabai merah, dan kecap kedelai. Menghasilkan nasi goreng harum sedap dalam hitungan menit.',
      },
      en: {
        name: 'Authentic Indonesian Fried Rice Paste',
        description: 'Classic Indonesian Nasi Goreng seasoning paste (120g) infused with roasted shrimp paste, shallots, red chilies, and sweet soy notes. Restaurant-quality fried rice at home in minutes.',
      },
      ja: {
        name: '本格ナシゴレン スパイスペースト',
        description: '香ばしいエビの発酵調味料（トラシ）、赤エシャロット、唐辛子を効かせた本格ナシゴレンの素（120g）。炒めるだけで屋台の味を再現。',
      },
      tl: {
        name: 'Espesyal na Bumbu Nasi Goreng Paste',
        description: 'Masarap na pampalasa sa fried rice (120g) na may sangkap na bagoong alamang, pulang sili, at sibuyas. Mabilis at madaling lutuing almusal o hapunan.',
      },
      vi: {
        name: 'Gia Vị Cơm Chiên Nasi Goreng Đặc Biệt',
        description: 'Sốt gia vị cơm chiên Nasi Goreng chuẩn vị Indonesia (120g) từ mắm ruốc nướng, hành tím và ớt đỏ. Cho đĩa cơm chiên thơm nức mũi chỉ sau vài phút.',
      },
      th: {
        name: 'เครื่องปรุงข้าวผัดนาซิโกเร็งสูตรพิเศษ',
        description: 'พริกแกงข้าวผัดอินโดนีเซียแท้ (120 กรัม) ผสมกะปิย่าง หอมแดง และพริกแดง ผัดง่าย อร่อยเข้มข้นเหมือนรับประทานที่ร้าน',
      },
      hi: {
        name: 'प्रामाणिक नासी गोरेंग फ्राइड राइस पेस्ट',
        description: 'क्लासिक इंडोनेशियाई फ्राइड राइस मसाला पेस्ट (120 ग्राम)। भुने हुए झींगे के पेस्ट, प्याज और लाल मिर्च का स्वादिष्ट मेल। मिनटों में तैयार।',
      },
      zh: {
        name: '正宗印尼炒饭特调香料酱（Nasi Goreng）',
        description: '经典印尼炒饭酱膏（120克），秘制慢焙虾酱（Terasi）、红葱头与红辣椒精华，镬气十足，轻松炒出星级南洋风味炒饭。',
      },
    },
  },
  {
    id: 'bumbu-dapur-komplit',
    category: 'Bumbu & Rempah',
    price: 220,
    rating: 4.9,
    reviews: 180,
    stock: 40,
    image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=1200&q=85',
    accent: '#b87333',
    localizedContent: {
      id: {
        name: 'Paket Bumbu Dapur Komplit (Bawang & Kemiri)',
        description: 'Paket bumbu dapur segar (400g) berisi bawang merah brebes, bawang putih kating wangi, kemiri bulat utuh, dan ketumbar biji pilihan. Bumbu dasar wajib untuk aneka masakan rumahan.',
      },
      en: {
        name: 'Essential Kitchen Aromatics (Shallots, Garlic & Candlenuts)',
        description: 'Fresh culinary base bundle (400g) containing aromatic red shallots, plump garlic cloves, whole candlenuts, and whole coriander seeds. The essential foundation of Asian home cooking.',
      },
      ja: {
        name: '基本の台所スパイスセット（赤エシャロット・大蒜・ククイナッツ）',
        description: '料理の決め手となる新鮮な赤エシャロット、香りの良いニンニク、丸ごとククイナッツ、コリアンダーシードの厳選セット（400g）。',
      },
      tl: {
        name: 'Kumpletong Sangkap Pampalasa (Sibuyas, Bawang at Kemiri)',
        description: 'Sariwang paket ng pampalasa sa kusina (400g): pulang sibuyas, bawang, buong candlenuts, at buto ng kulantro. Pangunahing gisa sa pang-araw-araw na ulam.',
      },
      vi: {
        name: 'Bộ Gia Vị Bếp Thiết Yếu (Hành Tím, Tỏi & Hạt Lai)',
        description: 'Bộ gia vị nấu ăn tươi sạch (400g) gồm hành tím thơm, tỏi ta tép chắc, hạt lai kemiri và hạt ngò rí thơm lừng. Linh hồn của các món kho, xào, nấu canh.',
      },
      th: {
        name: 'ชุดเครื่องครัวสมุนไพรพื้นฐาน (หอมแดง กระเทียม เมล็ดแคนเดิลนัท)',
        description: 'ชุดวัตถุดิบเครื่องเทศสดสำหรับก้นครัว (400 กรัม) ประกอบด้วยหอมแดง กระเทียมกลีบแน่น เมล็ดแคนเดิลนัท และเม็ดผักชี สำหรับเตรียมพริกแกงทุกชนิด',
      },
      hi: {
        name: 'आवश्यक रसोई मसाला कॉम्बो (प्याज, लहसुन और कैंडलनट)',
        description: 'ताज़ा एशियाई मसाला सामग्री (400 ग्राम): लाल प्याज, लहसुन की कलियां, साबुत कैंडलनट और धनिया के बीज। हर प्रकार की करी और ग्रेवी का मुख्य आधार।',
      },
      zh: {
        name: '厨房必备基础鲜辛香料组合（红葱头、大蒜与石栗）',
        description: '精选家庭常备南洋厨房调味组合（400克）：紫皮小红葱、浓香大蒜瓣、整颗石栗果（Kemiri）及原粒芫荽籽，研磨生香，提味增鲜。',
      },
    },
  },
  {
    id: 'indomie-goreng-spesial',
    category: 'Mie & Pasta',
    price: 380,
    rating: 5.0,
    reviews: 540,
    stock: 70,
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=85',
    accent: '#c73826',
    localizedContent: {
      id: {
        name: 'Indomie Mi Goreng Spesial (Isi 5 Bungkus)',
        description: 'Mi instan goreng legendaris Indonesia (5x85g). Dilengkapi bumbu pasta manis gurih, minyak bawang harum, kecap manis khas, saus cabai, dan taburan bawang goreng renyah.',
      },
      en: {
        name: 'Indomie Special Fried Instant Noodles (5-Pack)',
        description: 'The legendary Indonesian instant stir-fried noodles (5x85g). Includes savory seasoning powder, seasoned oil, sweet soy sauce, chili sauce, and crispy fried shallots.',
      },
      ja: {
        name: 'インドミ・ミーゴレン 即席麺（5食パック）',
        description: '世界中で愛されるインドネシアの定番焼きそば即席麺（5袋入り）。甘辛い特製ソース、調味油、フライドオニオンのトッピングがやみつきになる美味しさ。',
      },
      tl: {
        name: 'Indomie Mi Goreng Special (5-Pack)',
        description: 'Ang tanyag na instant fried noodles mula Indonesia (5x85g). May kasamang pampalasa, seasoned oil, sweet soy sauce, chili sauce, at malutong na pritong sibuyas.',
      },
      vi: {
        name: 'Mì Xào Khô Indomie Goreng Đặc Biệt (Gói 5)',
        description: 'Mì xào khô ăn liền nổi tiếng Indonesia (lốc 5 gói x 85g). Đầy đủ gói gia vị sốt cay ngọt, dầu hành thơm phức, nước tương đen và hành phi giòn rụm.',
      },
      th: {
        name: 'บะหมี่กึ่งสำเร็จรูป อินโดหมี่ หมี่โกเรง (แพ็ค 5 ซอง)',
        description: 'บะหมี่ผัดแห้งกึ่งสำเร็จรูปรสเด็ดยอดนิยมระดับโลก (5 ซอง x 85 กรัม) เส้นเหนียวนุ่ม พร้อมซอสหวานเผ็ดกลมกล่อมและหอมเจียวกรุบกรอบ',
      },
      hi: {
        name: 'इंडोमी स्पेशल फ्राइड इंस्टेंट नूडल्स (5-पैक)',
        description: 'विश्व प्रसिद्ध इंडोनेशियाई इंस्टेंट फ्राइड नूडल्स (5x85 ग्राम)। स्वादिष्ट मसाला, मीठी सोया सॉस, मिर्च सॉस और कुरकुरे तले हुए प्याज के साथ।',
      },
      zh: {
        name: '印尼营多原味特制捞面（Indomie Mi Goreng 5连包）',
        description: '享誉全球的经典印尼干捞方便面（5包x85克特惠装）。附特调鲜香粉、香葱油、黑甜酱油、辣酱及香脆黄金葱酥，面条Q弹筋道。',
      },
    },
  },
  {
    id: 'mie-telur-keriting',
    category: 'Mie & Pasta',
    price: 220,
    rating: 4.8,
    reviews: 135,
    stock: 50,
    image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=1200&q=85',
    accent: '#df9c34',
    localizedContent: {
      id: {
        name: 'Mie Telur Keriting Kering Super (200g)',
        description: 'Mie kering olahan telur berkualitas tinggi dengan tekstur keriting kenyal dan tidak mudah lembek. Sangat lezat dimasak mie goreng Jawa, mie kuah bakso, atau mie ayam pangsit.',
      },
      en: {
        name: 'Premium Curly Egg Noodles (200g)',
        description: 'High-grade dried curly egg noodles (200g) with a firm, springy bite. Holds sauces exceptionally well; perfect for Asian stir-fried chow mein, wonton soup, or ramen bowls.',
      },
      ja: {
        name: '本格ちぢれ卵麺（乾麺 200g）',
        description: 'コシと弾力にこだわった上質な乾燥ちぢれ卵麺（200g）。スープがよく絡み、焼きそば、ワンタン麺、ラーメン、鍋の〆にもぴったり。',
      },
      tl: {
        name: 'Premium Curly Egg Noodles (200g)',
        description: 'Mataas na uri ng pinatuyong kulot na egg noodles (200g) na may makunat at masarap na kagat. Mainam para sa pancit canton, mami, o lomi.',
      },
      vi: {
        name: 'Mì Trứng Sợi Xoăn Cao Cấp (200g)',
        description: 'Mì trứng sấy khô sợi xoăn hảo hạng (200g), sợi mì vàng óng dai ngon tự nhiên, không bở nát. Thích hợp xào giòn, xào mềm hoặc nấu mì hoành thánh.',
      },
      th: {
        name: 'บะหมี่ไข่เส้นหยักพรีเมียม (200 กรัม)',
        description: 'บะหมี่ไข่อบแห้งเส้นหยักคุณภาพเยี่ยม (200 กรัม) เส้นเหนียวนุ่มเด้ง ไม่เละง่าย เหมาะสำหรับทำบะหมี่ผัด บะหมี่เกี๊ยว หรือก๋วยเตี๋ยวน้ำใส',
      },
      hi: {
        name: 'प्रीमियम घुंघराले अंडा नूडल्स (200 ग्राम)',
        description: 'उच्च गुणवत्ता वाले सूखे घुंघराले एग नूडल्स (200 ग्राम)। स्प्रिंगी और स्वादिष्ट, चाउमीन, नूडल सूप या स्टिर-फ्राई के लिए उत्तम।',
      },
      zh: {
        name: '特级波纹全蛋干面（精选鸡蛋卷面 200克）',
        description: '精选优质小麦粉与新鲜全蛋精制波纹卷面（200克）。耐煮爽滑，面体筋道富有弹性，极易挂汁，宜做港式炒面、云吞面及高汤汤面。',
      },
    },
  },
  {
    id: 'sanuki-udon-segar',
    category: 'Mie & Pasta',
    price: 320,
    rating: 4.9,
    reviews: 240,
    stock: 40,
    image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=1200&q=85',
    accent: '#597387',
    localizedContent: {
      id: {
        name: 'Mie Sanuki Udon Segar Kenyal (3 Porsi)',
        description: 'Mie udon basah segar khas Kagawa Jepang (3 porsi x 200g). Tekstur tebal, kenyal, dan licin lembut di mulut. Nikmat disajikan dingin dengan saus tsuyu atau hangat dalam kuah dashi.',
      },
      en: {
        name: 'Fresh Chewy Sanuki Udon Noodles (3-Pack)',
        description: 'Authentic fresh Japanese Sanuki-style thick udon noodles (3x200g). Features a delightfully springy chew and silky texture. Perfect hot in dashi broth or chilled with tsuyu dipping sauce.',
      },
      ja: {
        name: '讃岐生うどん もちもち食感（3人前 つゆなし）',
        description: '本場香川の伝統製法に学んだ本格生うどん（200g×3玉）。讃岐ならではの強いコシともちもちした喉越しが絶品。かけうどん、ざる、焼うどんに。',
      },
      tl: {
        name: 'Sariwang Sanuki Udon Noodles (3 Servings)',
        description: 'Otentikong makapal at sariwang Japanese udon noodles (3x200g). Makunat at madulas ang bawat hibla. Masarap ihain sa mainit na dashi sabaw o malamig na dipping sauce.',
      },
      vi: {
        name: 'Mì Udon Tươi Sanuki Dai Ngon (3 Khẩu Phần)',
        description: 'Mì Udon tươi truyền thống phong cách Sanuki Nhật Bản (3 vắt x 200g). Sợi mì tròn dày, dai mướt trơn mịn. Tuyệt hảo khi nấu udon bò nóng hoặc udon lạnh chấm sốt.',
      },
      th: {
        name: 'เส้นอุด้งสดซานุกิ นุ่มเหนียวหนึบ (3 ที่)',
        description: 'เส้นอุด้งสดสไตล์ซานุกิต้นตำรับญี่ปุ่น (3 ซอง x 200 กรัม) เส้นหนานุ่มเหนียวหนึบเคี้ยวเพลิน อร่อยได้ทั้งแบบร้อนในน้ำซุปดาชิและแบบเย็น',
      },
      hi: {
        name: 'ताज़ा सानुकी उडोन नूडल्स (3 सर्विंग्स)',
        description: 'प्रामाणिक जापानी शैली के मोटे और चीवी ताज़ा उडोन नूडल्स (3x200 ग्राम)। स्वादिष्ट दाशी शोरबे या ठंडे डिपिंग सॉस के साथ परोसने के लिए आदर्श।',
      },
      zh: {
        name: '正宗日式赞岐生乌冬面（劲道爽滑 3人份）',
        description: '传统赞岐制法厚实鲜乌冬面（200克x3份）。面体粗圆洁白，口感Q弹扎实，入口顺滑，适合制作日式清汤牛肉乌冬、咖喱乌冬或冷面蘸汁。',
      },
    },
  },
  {
    id: 'biskuit-kelapa-renyah',
    category: 'Makanan Ringan',
    price: 180,
    rating: 4.8,
    reviews: 290,
    stock: 60,
    image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=1200&q=85',
    accent: '#c99352',
    localizedContent: {
      id: {
        name: 'Biskuit Kelapa Renyah Tradisional (300g)',
        description: 'Biskuit kelapa panggang renyah dengan aroma kelapa parut asli yang harum dan manis pas (300g). Camilan teman minum teh, kopi, atau dicelup susu hangat.',
      },
      en: {
        name: 'Crisp Traditional Coconut Biscuits (300g)',
        description: 'Golden-baked crispy biscuits made with real shredded coconut and a hint of vanilla (300g). Light, crumbly, and sweet; an iconic accompaniment for afternoon tea or coffee.',
      },
      ja: {
        name: 'サクサク伝統ココナッツビスケット（300g）',
        description: '本物のすりおろしココナッツを練り込んで香ばしく焼き上げたクリスピービスケット（300g）。優しい甘みとサクサク食感でお茶請けに最適。',
      },
      tl: {
        name: 'Malutong na Biskwit na Niyog (300g)',
        description: 'Gintong-inihaw na malutong na biskwit na may totoong kinudkod na niyog (300g). Masarap na meryenda kasama ang mainit na kape o tsaa.',
      },
      vi: {
        name: 'Bánh Quy Dừa Giòn Thơm Truyền Thống (300g)',
        description: 'Bánh quy nướng vàng ươm thơm lừng cơm dừa tươi tự nhiên (300g). Độ ngọt vừa phải, giòn xốp rôm rốp, thích hợp nhâm nhi cùng tách trà nóng hay cà phê.',
      },
      th: {
        name: 'บิสกิตมะพร้าวอบกรอบสูตรดั้งเดิม (300 กรัม)',
        description: 'บิสกิตมะพร้าวอบสีเหลืองทองหอมกรุ่นจากเนื้อมะพร้าวแท้ (300 กรัม) กรอบอร่อย หวานกำลังดี เหมาะสำหรับทานคู่กับชาหรือกาแฟยามบ่าย',
      },
      hi: {
        name: 'कुरकुरे पारंपरिक नारियल बिस्कुट (300 ग्राम)',
        description: 'ताज़े कद्दूकस किए हुए नारियल और वेनिला के स्वाद से बेक किए गए कुरकुरे सुनहरे बिस्कुट (300 ग्राम)। सुबह या शाम की चाय-कॉफ़ी के लिए बेहतरीन साथी।',
      },
      zh: {
        name: '香浓酥脆传统纯椰子饼干（300克）',
        description: '精选纯正天然椰丝烘焙而成的金黄酥脆椰香饼干（300克）。椰香浓郁诱人，甜而不腻，入口咔嚓爽脆，是午后下午茶及咖啡的绝佳伴侣。',
      },
    },
  },
  {
    id: 'biskuit-gandum-madu',
    category: 'Makanan Ringan',
    price: 210,
    rating: 4.9,
    reviews: 165,
    stock: 45,
    image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=1200&q=85',
    accent: '#8f6436',
    localizedContent: {
      id: {
        name: 'Biskuit Gandum Madu Utuh Pilihan (250g)',
        description: 'Biskuit gandum utuh kaya serat berpadu sentuhan madu hutan alami (250g). Tekstur padat renyah, lezat dan mengenyangkan untuk sarapan praktis atau camilan sehat.',
      },
      en: {
        name: 'Whole Wheat Honey Digestive Biscuits (250g)',
        description: 'High-fiber digestive biscuits crafted with whole grain wheat flour and pure forest honey (250g). Hearty, satisfying crunch for healthy snacking or wholesome breakfast.',
      },
      ja: {
        name: '全粒粉ハニーダイジェスティブビスケット（250g）',
        description: '食物繊維たっぷりの全粒粉と天然はちみつで焼き上げたヘルシーなダイジェスティブビスケット（250g）。香ばしくザクザクした食感が魅力。',
      },
      tl: {
        name: 'Whole Wheat Honey Digestive Biscuits (250g)',
        description: 'Biskwit na mayaman sa fiber na gawa sa whole wheat at natural na pulot-pukyutan (250g). Masustansya at masarap para sa meryenda o agahan.',
      },
      vi: {
        name: 'Bánh Quy Lúa Mì Nguyên Cám Mật Ong (250g)',
        description: 'Bánh quy lúa mì nguyên cám giàu chất xơ kết hợp mật ong rừng thanh ngọt (250g). Giòn bùi tự nhiên, tốt cho sức khỏe và vóc dáng, bổ sung năng lượng nhanh chóng.',
      },
      th: {
        name: 'บิสกิตโฮลวีตราดน้ำผึ้งเพื่อสุขภาพ (250 กรัม)',
        description: 'บิสกิตข้าวสาลีโฮลวีทใยอาหารสูงผสมน้ำผึ้งธรรมชาติ (250 กรัม) เนื้อสัมผัสกรุบกรอบ มีประโยชน์ อิ่มสบายท้อง เหมาะเป็นของว่างเพื่อสุขภาพ',
      },
      hi: {
        name: 'साबुत गेहूं और शहद पाचक बिस्कुट (250 ग्राम)',
        description: 'फाइबर से भरपूर साबुत गेहूं के आटे और प्राकृतिक शहद से तैयार किए गए पाचक बिस्कुट (250 ग्राम)। स्वस्थ नाश्ते और पौष्टिक स्नैक के लिए उत्तम।',
      },
      zh: {
        name: '全麦蜂蜜高纤营养消化饼干（250克）',
        description: '精选全麦粗粮面粉与天然森林纯蜂蜜焙烤而成的粗粮高纤饼干（250克）。麦香馥郁醇厚，口感扎实松脆，营养饱腹，健康无负担。',
      },
    },
  },
];
