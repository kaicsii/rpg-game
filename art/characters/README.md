# 角色美術設定

## 莉恩與洛恩的美術原稿

- [高清人設圖](lien-loren-hd.png)為 1536 × 1024 像素的雙人原創設計稿。以內建 imagegen 生成，提示詞指定羊皮紙底色、水彩與不透明水粉質感、全身構圖。莉恩以深青星徽帽、象牙色圍巾和黃銅提燈辨識，洛恩以銀髮、銀甲、灰藍披肩和長劍辨識。
- [莉恩像素原稿](lien-sprite-source.png)與[洛恩像素原稿](loren-sprite-source.png)以高清稿為參考，分別用內建 imagegen 轉成透明背景的 16-bit 像素圖。提示詞指定正面、右側、背面、左側四列，每列為待機、左右兩個步態及戰鬥動作，並保留各自的人設特徵。
- 遊戲使用 `src/assets/` 內的圖集。可用 `node scripts/pack-hero-sprites.mjs` 從像素原稿重新裁格和對齊，需要 FFmpeg 與 FFprobe。高清稿與像素原稿不會載入遊戲。

<details>
<summary>生成提示詞</summary>

高清稿

> Use case: stylized-concept. Asset type: source character design board for the original fantasy RPG Starlight Chronicle, to be translated into 16-bit sprites later. Make ONE beautiful high-resolution horizontal image: two full-body designs at matching scale, widely separated, on a pale muted parchment field, with a subtle soft vignette and no setting. Left: Lien, adult woman village lamplighter, upright and warm, chestnut bob with a small side sweep, short wide-brim deep petrol teal pilgrim hat bearing one tiny brass star, teal tailored short travel coat with ochre binding, warm ivory scarf, umber leggings and boots, holding a brass square cage lantern glowing amber, no weapon. Right: Loren, adult male former watch knight, quiet and kind, ash-silver slightly messy short hair, weathered silver plate layered over muted steel-blue cloth and a slate half cape, brown leather belts, black boots, simple one-handed straight sword with brass crossguard held tip down. Different silhouettes immediately identifiable: Lien's wide hat and lantern, Loren's silver shoulder armor and sword. Both completely visible with comfortable head and foot margins, disconnected silhouettes. Sophisticated hand-painted watercolor and gouache game production illustration with crisp descriptive edges, controlled shadows, visibly designed clothing, distinct values, warm muted gold and cool misty blue; high quality finished original fantasy concept art, appealing stylized human proportions, readable at thumbnail scale. No lettering, text, extra poses, extra portraits, frames, logos, watermark, grids, pixelation, realistic photography or 3D render.

像素圖共用提示

> Edit the attached high-resolution character concept board into a single production-ready sprite sheet of ONE character for an original HD-2D RPG.
>
> Create a SQUARE sheet divided into EXACTLY FOUR EQUAL COLUMNS by FOUR EQUAL ROWS. Sixteen full-body figures total, one centered in each cell with padding on all sides. No drawn grid. Row 1 facing screen down (visible front), row 2 facing screen right (profile pointing right), row 3 facing screen up (show back of body and head), row 4 facing screen left (profile pointing left). Every row has four frames ordered left to right: idle feet together, WALK left foot forwards, WALK right foot forwards (opposite stride), then action pose. Distinct visible foot placement in the walking frames. Strict technical layout: align both standing boots across each row, steady relative body scale and stable costume/equipment, generous transparent gaps between frames, especially action/sword poses. Camera is a mildly elevated fixed view, consistent across the sheet. Medium-chibi SNES style, head roughly a third of character height, excellent silhouette. True sharply clustered 16-bit pixel art as if designed at about 48x56 pixels per frame and displayed in a large integer nearest-neighbor preview. Use crisp block pixels, clean outline, flat color clusters, restrained earthy palette with selective golden highlights, no gradients or smooth vector shading. No dust, duplicated figures, text, labels, props on the floor, cast shadows, glows outside silhouette, background elements, gradients, or UI. Genuinely transparent PNG background.

莉恩的補充描述

> Use ONLY the LEFT woman from the reference. Lien, female lantern keeper, chestnut bob, broad petrol teal pilgrim hat and tiny brass star, ivory scarf, fitted teal ochre-trimmed coat, leather trousers and boots, bright amber brass cage lantern. One lantern only throughout. In the action column she holds the lantern forward at shoulder height.

洛恩的補充描述

> Use ONLY the RIGHT man from the reference. Loren, silver tousled hair, antique silver shoulder armor and breastplate, slate blue half cape and tabard, black leather boots, simple steel sword with brass crossguard. One sword only throughout. In the action column he steps forward with sword raised ready to slash.

</details>

## NPC、敵人與首領

地圖、對話與戰鬥沿用靛藍描邊、分層像素色塊與少量黃銅亮點。布料、木、鏽鐵、紙和靈光各有不同的明暗與邊緣。角色縮到地圖比例時，先看剪影，再看道具，最後才靠配色辨認。兩位主角仍使用上方圖集。

### 地圖上的 NPC

[地圖居民像素圖稿](npc-roster.png)

| 角色 | 剪影與辨識物 |
| --- | --- |
| 守燈婆婆 | 銀髮低髻、梅灰長衣、燕麥色披肩。提一盞舊黃銅燈，與莉恩的巡燈裝呼應。 |
| 行腳商人 | 青灰寬簷帽、皮背心與厚皮貨包。兩道交叉皮帶和方扣凸出輪廓。 |
| 米菈 | 短身形、雙辮、蜜褐圍裙與摺紙船。人物以船頭朝上的三角形辨識。 |
| 候車母親 | 乾燥玫瑰色頭巾、寬披肩與貼身收好的行囊。輪廓收攏，像在候車時避風。 |
| 桑榆 | 深靛短帽、黃銅排扣制服、舊車票。帽上的站務章和垂直衣襟使姿態挺直。 |
| 伊朵 | 青玻璃護目鏡、赭紅工作衣與耐磨圍裙，手提分叉聲簧。 |
| 亞岑 | 鋼藍巡燈衣、斜掛繃帶與短支杖，杖頭嵌青灰金屬。 |
| 芙蕾 | 紙白長衣、霧紫領襟、眼鏡與硬殼登記冊。 |
| 寄存者甲 | 煙紫深兜帽與封口信，信封保留封蠟。 |
| 寄存者乙 | 茶褐背心、垂髮與手持的紙邊冊，像準備帶回一份紀錄。 |
| 寄存者丙 | 水藍包頭巾、灰青斗篷與小茶碗，重心落在貼近身側的手。 |
| 村中鄰居 | 苔綠工作衣、家用頭巾與添燈油壺。 |

### 支線、集會與回憶

[對話與回憶像素圖稿](dialogue-roster.png)

| 人物 | 剪影與辨識物 |
| --- | --- |
| 站務員 | 灰青制服、淺青帽帶與封緘郵件，同站制服以帽章與配色區別職責。 |
| 旅客 | 寬帽、土褐旅披和路包。 |
| 原持票人 | 銀灰鬢髮、紫褐背心與手上攤開的舊票。 |
| 修聲棚見習者 | 青綠工作衣、束髮巾、量測用的短聲簧。 |
| 核對紀錄的寄存者 | 深色雙辮、灰藕背心與可帶走的紀錄副本。 |
| 練習暫停的寄存者 | 灰綠兜帽、寬披肩與折好的「下次再談」。 |
| 公開會議的居民 | 煙褐頭巾、磚紅短衣與空手姿態。 |
| 霧鐘村居民甲 | 草綠背心、雙辮與想帶回的封件。 |
| 霧鐘村居民乙 | 靛灰閉合兜帽，雙手留在斗篷旁。 |
| 霧鐘村居民丙 | 米褐頭巾、備茶圍裙與陶碗。 |
| 守橋人的回音 | 青灰寬帽、褪色斗篷與午餐陶碗，同時供早年橋邊招呼的回音使用。 |
| 村人的回音 | 霧紫兜帽、缺乏飽和暖色的披肩與一盞燈，像記憶把多個人的期待疊在一起。 |
| 過去的洛恩 | 保留銀髮與劍，補上完整冷銀披肩和亮金扣飾，對照現在的旅行裝。 |

傳話沿用說話人的肖像。旁白、不具名的記憶聲音、站內廣播與具文字的故事物件以星徽呈現。回憶中的人物沿用相同造型，以場景的光色與透明度表現回音。

### 一般敵人

[一般敵人像素圖稿](enemy-roster.png)

| 敵人 | 剪影與辨識物 |
| --- | --- |
| 露珠軟泥 | 貼地的青綠凝膠丘，散落露點與一片薄亮反光。 |
| 月塵蛾 | 四瓣粉灰翅、對稱的深色眼斑與暖白翅粉。 |
| 迷途樹靈 | 矮樹根、偏向一側的嫩葉冠與琥珀樹眼。 |
| 沉星幽火 | 頭尾相反的青藍焰尖、漂浮火屑和白色菱形焰心。 |
| 鏽甲守衛 | 直立舊量產盔甲、窄面罩、方盾，以及沿護肩散開的赤鏽。 |
| 蝕影渡鴉 | 銳尖暗羽、分叉垂尾與低調的磨銅喙。 |

### 首領

[首領與雙階段像素圖稿](boss-roster.png)

| 首領 | 剪影與辨識物 |
| --- | --- |
| 古橋守木 | 左右高低不一的枝冠、幾處舊鈴繫帶和琥珀木結。蓄力時抬起根臂並照亮木結。 |
| 遺忘的守潮者 | 水蝕青銅、重型圓肩、缺口三叉戟，甲面刻三道水位記號。 |
| 末班巡軌者 | 煙囪、雙車窗、頭燈和格柵構成帶鏽的列車頭，黃光集中於中央。 |
| 離巢鳴鷲 | 不對稱的上揚巨翼、米白頸羽、勾喙和散羽；出手時抬升一側翼尖。 |
| 白頁典守 | 書櫃般的方形墨鐵框，把展開的白頁鎖在胸口；出手時有紙頁掀起。 |
| 誓約殘像 | 斷續垂落的紫灰甲影與水平寒色劍線，保留洛恩的身分線索。 |
| 無光的守鐘人 | 冷銀半面甲和沉重鐘形長袍，胸前一道收攏的星痕，呼應洛恩。 |
| 守鐘人的最後長夜 | 長袍與面甲保留，裂開的銅橙鐘圈、擴散的火紋及暖色星痕形成第二階段剪影。變身過場、戰鬥和行動列共用此形態。 |

以上圖稿來自遊戲使用的 48 × 60 像素繪圖。繪圖與變體在 `src/sprites.ts`，服裝配色、人物對話別名及首領階段在 `src/character-art.ts`。

### 敵人與首領動作

場上動作以待機、預備、出手、收勢和受擊為節點。命中落在出手的峰值，重擊沿用同一套架勢並加大動作。破盾時收低姿態，倒下時沉降並淡出。開啟減少動態效果時，以靜態蓄力／破盾姿勢、命中提示與傷害數字傳達戰況。

| 角色 | 待機與出手 |
| --- | --- |
| 露珠軟泥 | 身體緩慢起伏，先壓扁，再彈起撞擊，落地時攤開。 |
| 月塵蛾 | 四瓣翅短拍，出手前高舉翼尖，再下扇灑出翅粉。 |
| 迷途樹靈 | 葉冠帶著身體輕擺，抬起根臂往前拍落。 |
| 沉星幽火 | 火屑在焰心周圍漂浮，先聚成小焰，再拔高向前竄出。 |
| 鏽甲守衛 | 站姿沉穩，先抬盾舉劍，向前踏步揮斬，再收回盾側。 |
| 蝕影渡鴉 | 掠拍升高，收窄翼尖俯衝，擦過目標再翻翅回升。 |
| 古橋守木 | 枝冠慢擺，蓄力時高舉根臂並點亮木結。根鬚橫掃一次命中全隊，破盾時根臂垂落。 |
| 遺忘的守潮者 | 重甲微擺，先抬三叉戟，再向前送出並沉肩收勢。 |
| 末班巡軌者 | 煙囪有短促蒸汽。向後撤一步點亮頭燈，向前撞出後壓低車身減速。 |
| 離巢鳴鷲 | 大翼升拍、短暫抬高，再以更深的角度俯衝，反拍拉升。 |
| 白頁典守 | 紙頁在封存框周圍掀起，出手時框身前傾、紙頁飛散，再闔回。 |
| 誓約殘像 | 虛浮甲影與碎片上下游移，拉開身位後平掠劍刃，回收時劍鋒下落。 |
| 無光的守鐘人 | 鐘形袍微浮，先抬劍，再以沉重的揮擊向前跨出。 |
| 守鐘人的最後長夜 | 裂鐘圈的火光沿輪廓跳動，躍起出手，落下時火屑仍留在鐘圈周圍。 |

各角色的節奏和位移在 `src/enemy-motion.ts`，對應像素姿勢在 `src/sprites.ts`。
