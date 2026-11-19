# 莉恩與洛恩的美術原稿

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
