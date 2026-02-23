-- Seed data for local dev (FULL DB compatible)

INSERT INTO member_ranks(rank_code, rank_name, min_spend, discount_percent, is_active)
VALUES
('BRONZE','Đồng',0,0,1),
('SILVER','Bạc',1000000,5,1),
('GOLD','Vàng',3000000,10,1),
('DIAMOND','Kim Cương',7000000,15,1)
ON DUPLICATE KEY UPDATE
rank_name=VALUES(rank_name),
min_spend=VALUES(min_spend),
discount_percent=VALUES(discount_percent),
is_active=VALUES(is_active);

INSERT INTO clients(phone, full_name, email, status, total_spend, rank_id)
SELECT '0900000000','Demo Client',NULL,'ACTIVE',0, r.rank_id
FROM member_ranks r
WHERE r.rank_code='BRONZE'
ON DUPLICATE KEY UPDATE
full_name=VALUES(full_name),
status=VALUES(status);

-- ===== BRANCH BASELINE (required for FK restaurant_tables.branch_id) =====
-- The canonical schema uses restaurant_tables.branch_id (FK -> branches).
-- For local dev/demo, we ensure branch_id=1 exists.
INSERT INTO branches(branch_id, branch_code, branch_name, address, phone, timezone, is_active, open_time, close_time)
VALUES
(1,'HCM1','Haidilao HCM - Demo','Demo Address, Ho Chi Minh City','0900000000','Asia/Ho_Chi_Minh',1,'09:00:00','22:00:00'),
(999,'HCM999','Haidilao HCM - Demo Branch 999','Demo Address, Ho Chi Minh City','0900000999','Asia/Ho_Chi_Minh',1,'09:00:00','22:00:00')
ON DUPLICATE KEY UPDATE
branch_code=VALUES(branch_code),
branch_name=VALUES(branch_name),
address=VALUES(address),
phone=VALUES(phone),
timezone=VALUES(timezone),
is_active=VALUES(is_active),
open_time=VALUES(open_time),
close_time=VALUES(close_time);

INSERT INTO restaurant_tables(branch_id, table_code, area_name, seats, table_status)
VALUES
(1,'A01','Zone A',4,'AVAILABLE'),
(1,'A02','Zone A',4,'AVAILABLE'),
(1,'B01','Zone B',6,'AVAILABLE'),
(999,'Z01','Zone Z',4,'AVAILABLE'),
(999,'Z02','Zone Z',4,'AVAILABLE')
ON DUPLICATE KEY UPDATE
table_status=VALUES(table_status),
seats=VALUES(seats),
area_name=VALUES(area_name);

-- ===== MENU BASELINE (Combo + Thịt + món nền) =====

INSERT INTO menu_categories(category_name, sort_order, is_active)
VALUES
('Nước lẩu',1,1),
('Combo',2,1),
('Thịt bò',3,1),
('Thịt heo',4,1),
('Thịt cừu',5,1),
('Hải sản',6,1),
('Viên & Há cảo',7,1),
('Rau & Nấm',8,1),
('Mì & Tinh bột',9,1),
('Nước uống',10,1),
('Tráng miệng',11,1),
('Gia vị',12,1)
ON DUPLICATE KEY UPDATE
    sort_order=VALUES(sort_order),
    is_active=VALUES(is_active);

-- Cache category ids
SELECT category_id INTO @cat_broth  FROM menu_categories WHERE category_name='Nước lẩu' LIMIT 1;
SELECT category_id INTO @cat_combo  FROM menu_categories WHERE category_name='Combo' LIMIT 1;
SELECT category_id INTO @cat_beef   FROM menu_categories WHERE category_name='Thịt bò' LIMIT 1;
SELECT category_id INTO @cat_pork   FROM menu_categories WHERE category_name='Thịt heo' LIMIT 1;
SELECT category_id INTO @cat_lamb   FROM menu_categories WHERE category_name='Thịt cừu' LIMIT 1;
SELECT category_id INTO @cat_sea    FROM menu_categories WHERE category_name='Hải sản' LIMIT 1;
SELECT category_id INTO @cat_ball   FROM menu_categories WHERE category_name='Viên & Há cảo' LIMIT 1;
SELECT category_id INTO @cat_veg    FROM menu_categories WHERE category_name='Rau & Nấm' LIMIT 1;
SELECT category_id INTO @cat_noodle FROM menu_categories WHERE category_name='Mì & Tinh bột' LIMIT 1;
SELECT category_id INTO @cat_drink  FROM menu_categories WHERE category_name='Nước uống' LIMIT 1;
SELECT category_id INTO @cat_dess   FROM menu_categories WHERE category_name='Tráng miệng' LIMIT 1;
SELECT category_id INTO @cat_sauce  FROM menu_categories WHERE category_name='Gia vị' LIMIT 1;

-- Broths
INSERT INTO menu_items(category_id, item_name, description, price, is_active, stock_qty)
VALUES
(@cat_broth,'Nước lẩu Tứ Xuyên (cay)','Vị cay tê, đậm đà.',59000,1,NULL),
(@cat_broth,'Nước lẩu Tom Yum','Chua cay kiểu Thái.',59000,1,NULL),
(@cat_broth,'Nước lẩu Nấm','Thanh ngọt, thơm nấm.',59000,1,NULL),
(@cat_broth,'Nước lẩu Xương hầm','Đậm vị xương, dễ ăn.',59000,1,NULL),
(@cat_broth,'Nước lẩu Cà chua','Chua ngọt, dễ ăn.',59000,1,NULL),
(@cat_broth,'Nước lẩu Hải sản','Ngọt thanh, thơm mùi biển.',69000,1,NULL),
(@cat_broth,'Nước lẩu Collagen','Béo nhẹ, sánh mịn.',69000,1,NULL),
(@cat_broth,'Nước lẩu Dược thiện','Thảo mộc, thơm nhẹ.',69000,1,NULL)
ON DUPLICATE KEY UPDATE
  price=VALUES(price), is_active=VALUES(is_active), description=VALUES(description);

-- Beef
INSERT INTO menu_items(category_id, item_name, description, price, is_active, stock_qty)
VALUES
(@cat_beef,'Bò Mỹ thái mỏng (Short Plate)','Mềm, béo nhẹ.',129000,1,NULL),
(@cat_beef,'Bắp bò (Brisket)','Thịt chắc, thơm.',139000,1,NULL),
(@cat_beef,'Gầu bò','Béo giòn, hợp lẩu cay.',149000,1,NULL),
(@cat_beef,'Nạm bò','Mềm vừa, ít mỡ.',139000,1,NULL),
(@cat_beef,'Gân bò','Dai giòn, ninh lẩu ngon.',99000,1,NULL),
(@cat_beef,'Thăn bò Wagyu (Premium)','Vân mỡ đẹp, mềm.',219000,1,NULL),
(@cat_beef,'Lõi vai (Chuck Roll)','Cân bằng nạc - mỡ, mềm.',159000,1,NULL),
(@cat_beef,'Thăn ngoại (Striploin)','Mềm, thơm, ít gân.',179000,1,NULL),
(@cat_beef,'Ribeye bò Mỹ','Vân mỡ đều, ngậy.',199000,1,NULL),
(@cat_beef,'Diềm thăn (Skirt Steak)','Thơm, đậm vị.',169000,1,NULL),
(@cat_beef,'Bò cuộn nấm kim châm','Cuộn sẵn, dễ ăn.',149000,1,NULL),
(@cat_beef,'Ba chỉ bò cuộn phô mai','Béo thơm, tan chảy.',169000,1,NULL),
(@cat_beef,'Lưỡi bò thái lát','Giòn nhẹ, thơm.',179000,1,NULL),
(@cat_beef,'Sách bò','Giòn sần sật.',129000,1,NULL),
(@cat_beef,'Lá sách bò','Giòn, hợp lẩu cay.',129000,1,NULL),
(@cat_beef,'Tim bò','Dai giòn, thơm.',119000,1,NULL),
(@cat_beef,'Đuôi bò','Hầm lẩu ngọt nước.',189000,1,NULL),
(@cat_beef,'Gầu bò Prime','Béo giòn, premium.',189000,1,NULL),
(@cat_beef,'Nạm bò Prime','Mềm, thơm, premium.',179000,1,NULL),
(@cat_beef,'Thăn nội (Tenderloin)','Siêu mềm, ít mỡ.',229000,1,NULL),
(@cat_beef,'Beef Tongue Premium','Lưỡi bò dày, thơm.',209000,1,NULL),
(@cat_beef,'Wagyu A5 (Limited)','Vân mỡ cực đẹp.',399000,1,NULL)
ON DUPLICATE KEY UPDATE
  price=VALUES(price), is_active=VALUES(is_active), description=VALUES(description);

-- Pork
INSERT INTO menu_items(category_id, item_name, description, price, is_active, stock_qty)
VALUES
(@cat_pork,'Ba chỉ heo','Béo mềm, dễ ăn.',99000,1,NULL),
(@cat_pork,'Nạc vai heo','Mềm, ít mỡ.',99000,1,NULL),
(@cat_pork,'Heo Iberico (Premium)','Thơm béo, ngọt thịt.',179000,1,NULL),
(@cat_pork,'Sườn non','Ninh lẩu ngon.',129000,1,NULL),
(@cat_pork,'Nạc dăm heo','Mềm, xen mỡ nhẹ.',109000,1,NULL),
(@cat_pork,'Cổ heo thái mỏng','Thơm, giòn nhẹ.',119000,1,NULL),
(@cat_pork,'Bắp heo','Thịt chắc, ít mỡ.',119000,1,NULL),
(@cat_pork,'Tai heo','Giòn sần sật.',99000,1,NULL),
(@cat_pork,'Sườn sụn','Giòn, béo nhẹ.',139000,1,NULL),
(@cat_pork,'Heo cuộn nấm','Cuộn sẵn, dễ ăn.',129000,1,NULL)
ON DUPLICATE KEY UPDATE
  price=VALUES(price), is_active=VALUES(is_active), description=VALUES(description);

-- Lamb
INSERT INTO menu_items(category_id, item_name, description, price, is_active, stock_qty)
VALUES
(@cat_lamb,'Cừu Úc thái mỏng','Mùi thơm đặc trưng.',159000,1,NULL),
(@cat_lamb,'Sườn cừu','Thịt dày, ngọt.',199000,1,NULL),
(@cat_lamb,'Cừu cuộn nấm','Cuộn sẵn, thơm.',179000,1,NULL),
(@cat_lamb,'Gù cừu','Béo nhẹ, thơm mùi cừu.',189000,1,NULL),
(@cat_lamb,'Cừu non (Baby Lamb)','Mềm, ít mùi.',209000,1,NULL),
(@cat_lamb,'Sườn cừu Premium','Dày thịt, ngọt.',239000,1,NULL)
ON DUPLICATE KEY UPDATE
  price=VALUES(price), is_active=VALUES(is_active), description=VALUES(description);

-- Seafood
INSERT INTO menu_items(category_id, item_name, description, price, is_active, stock_qty)
VALUES
(@cat_sea,'Tôm sú','Tươi, chắc thịt.',149000,1,NULL),
(@cat_sea,'Mực ống','Giòn, ngọt.',139000,1,NULL),
(@cat_sea,'Nghêu','Ngọt nước.',99000,1,NULL),
(@cat_sea,'Bạch tuộc','Giòn, ngọt.',149000,1,NULL),
(@cat_sea,'Sò điệp','Ngọt, mềm.',179000,1,NULL),
(@cat_sea,'Hàu sữa','Béo, ngọt.',189000,1,NULL),
(@cat_sea,'Cá hồi phi lê','Béo, thơm.',199000,1,NULL),
(@cat_sea,'Thanh cua','Dễ ăn, hợp lẩu chua.',99000,1,NULL),
(@cat_sea,'Tôm càng xanh','Thịt chắc.',199000,1,NULL),
(@cat_sea,'Mực trứng','Béo, giòn.',169000,1,NULL),
(@cat_sea,'Bạch tuộc baby','Nhỏ, giòn.',139000,1,NULL)
ON DUPLICATE KEY UPDATE
  price=VALUES(price), is_active=VALUES(is_active), description=VALUES(description);

-- Balls & Dumplings
INSERT INTO menu_items(category_id, item_name, description, price, is_active, stock_qty)
VALUES
(@cat_ball,'Bò viên','Dai ngon.',59000,1,NULL),
(@cat_ball,'Cá viên','Thơm cá.',49000,1,NULL),
(@cat_ball,'Tôm viên','Giòn ngọt.',59000,1,NULL),
(@cat_ball,'Há cảo tôm','Nhân tôm, mềm.',69000,1,NULL),
(@cat_ball,'Đậu hũ phô mai','Béo thơm.',59000,1,NULL),
(@cat_ball,'Bò viên phô mai','Nhân phô mai, béo.',69000,1,NULL),
(@cat_ball,'Viên mực','Thơm mùi mực.',59000,1,NULL),
(@cat_ball,'Viên cá hồi','Béo, thơm.',69000,1,NULL),
(@cat_ball,'Chả cá thác lác','Dai, thơm.',69000,1,NULL),
(@cat_ball,'Hoành thánh tôm','Vỏ mỏng, nhân đầy.',79000,1,NULL),
(@cat_ball,'Há cảo sò điệp','Ngọt, mềm.',89000,1,NULL),
(@cat_ball,'Trứng cút','Bùi, dễ ăn.',39000,1,NULL),
(@cat_ball,'Đậu hũ ky cuộn','Thơm đậu, giòn nhẹ.',49000,1,NULL)
ON DUPLICATE KEY UPDATE
  price=VALUES(price), is_active=VALUES(is_active), description=VALUES(description);

-- Veggies & Mushrooms
INSERT INTO menu_items(category_id, item_name, description, price, is_active, stock_qty)
VALUES
(@cat_veg,'Nấm kim châm','Giòn, ngọt.',39000,1,NULL),
(@cat_veg,'Nấm bào ngư','Mềm, thơm.',49000,1,NULL),
(@cat_veg,'Cải thảo','Ngọt nước.',29000,1,NULL),
(@cat_veg,'Rau muống','Giòn.',29000,1,NULL),
(@cat_veg,'Bắp ngọt','Ngọt.',29000,1,NULL),
(@cat_veg,'Khoai môn','Bùi.',39000,1,NULL),
(@cat_veg,'Nấm đông cô','Thơm, mềm.',49000,1,NULL),
(@cat_veg,'Nấm mỡ','Mềm, dễ ăn.',49000,1,NULL),
(@cat_veg,'Rau tần ô','Thơm, hợp lẩu.',39000,1,NULL),
(@cat_veg,'Cải xanh','Giòn, ngọt.',29000,1,NULL),
(@cat_veg,'Bông cải xanh','Giòn, nhiều chất xơ.',39000,1,NULL),
(@cat_veg,'Bí đỏ','Bùi, ngọt.',39000,1,NULL),
(@cat_veg,'Đậu bắp','Giòn, nhớt nhẹ.',39000,1,NULL),
(@cat_veg,'Măng tươi','Giòn, thơm.',39000,1,NULL),
(@cat_veg,'Đậu hũ non','Mềm, béo nhẹ.',39000,1,NULL),
(@cat_veg,'Đậu hũ chiên','Béo, thơm.',39000,1,NULL),
(@cat_veg,'Khoai lang','Bùi, ngọt.',39000,1,NULL)
ON DUPLICATE KEY UPDATE
  price=VALUES(price), is_active=VALUES(is_active), description=VALUES(description);

-- Noodles
INSERT INTO menu_items(category_id, item_name, description, price, is_active, stock_qty)
VALUES
(@cat_noodle,'Mì tươi','Mềm dai.',29000,1,NULL),
(@cat_noodle,'Udon','Dày, dai.',39000,1,NULL),
(@cat_noodle,'Miến','Nhẹ, dễ ăn.',29000,1,NULL),
(@cat_noodle,'Bún tươi','Truyền thống.',29000,1,NULL),
(@cat_noodle,'Bánh phở','Mềm, dễ ăn.',29000,1,NULL),
(@cat_noodle,'Miến dong','Dai, thơm.',29000,1,NULL),
(@cat_noodle,'Bánh đa','Giòn dai.',29000,1,NULL),
(@cat_noodle,'Khoai tây lát','Bùi, giòn nhẹ.',39000,1,NULL),
(@cat_noodle,'Bánh quẩy','Giòn, thấm nước lẩu.',29000,1,NULL)
ON DUPLICATE KEY UPDATE
  price=VALUES(price), is_active=VALUES(is_active), description=VALUES(description);

-- Drinks
INSERT INTO menu_items(category_id, item_name, description, price, is_active, stock_qty)
VALUES
(@cat_drink,'Trà đá','',5000,1,NULL),
(@cat_drink,'Nước suối','',15000,1,NULL),
(@cat_drink,'Coca','Lon 330ml.',19000,1,NULL),
(@cat_drink,'Sprite','Lon 330ml.',19000,1,NULL),
(@cat_drink,'Fanta','Lon 330ml.',19000,1,NULL),
(@cat_drink,'Trà chanh','Chua nhẹ, thơm.',29000,1,NULL),
(@cat_drink,'Trà đào','Thơm đào, mát.',39000,1,NULL),
(@cat_drink,'Soda chanh','Có ga, mát.',35000,1,NULL),
(@cat_drink,'Nước mơ','Chua ngọt, dễ uống.',39000,1,NULL),
(@cat_drink,'Sữa đậu nành','Béo nhẹ.',29000,1,NULL),
(@cat_drink,'Yakult','Chua ngọt nhẹ.',29000,1,NULL)
ON DUPLICATE KEY UPDATE
  price=VALUES(price), is_active=VALUES(is_active), description=VALUES(description);

-- Dessert
INSERT INTO menu_items(category_id, item_name, description, price, is_active, stock_qty)
VALUES
(@cat_dess,'Chè khúc bạch','Mát, nhẹ.',39000,1,NULL),
(@cat_dess,'Kem ly','',29000,1,NULL),
(@cat_dess,'Pudding trứng','Mềm, béo.',39000,1,NULL),
(@cat_dess,'Sương sáo','Mát, nhẹ.',29000,1,NULL),
(@cat_dess,'Chè hạt sen','Thanh, bùi.',39000,1,NULL),
(@cat_dess,'Trái cây theo mùa','Tươi, mát.',49000,1,NULL),
(@cat_dess,'Mochi','Dẻo, ngọt.',39000,1,NULL)
ON DUPLICATE KEY UPDATE
  price=VALUES(price), is_active=VALUES(is_active), description=VALUES(description);

-- Sauces
INSERT INTO menu_items(category_id, item_name, description, price, is_active, stock_qty)
VALUES
(@cat_sauce,'Sa tế','',15000,1,NULL),
(@cat_sauce,'Nước chấm hải sản','',15000,1,NULL),
(@cat_sauce,'Nước tương','',10000,1,NULL),
(@cat_sauce,'Dầu hào','',10000,1,NULL),
(@cat_sauce,'Dầu mè','',10000,1,NULL),
(@cat_sauce,'Dấm đen','',10000,1,NULL),
(@cat_sauce,'Tỏi băm','',10000,1,NULL),
(@cat_sauce,'Hành phi','',10000,1,NULL),
(@cat_sauce,'Ớt tươi','',10000,1,NULL)
ON DUPLICATE KEY UPDATE
  price=VALUES(price), is_active=VALUES(is_active), description=VALUES(description);

-- ===== COMBOS (as menu_items + composition in combo_sets/combo_set_items) =====
INSERT INTO menu_items(category_id, item_name, description, price, is_active, stock_qty)
VALUES
(@cat_combo,'Combo 1 người - Solo','1 nước lẩu + 2 món thịt + 1 rau + 1 tinh bột + 1 nước.',299000,1,NULL),
(@cat_combo,'Combo 2 người - Signature','2 nước lẩu + 4 món thịt + 2 rau + 2 tinh bột + 2 nước.',599000,1,NULL),
(@cat_combo,'Combo 4 người - Family','2 nước lẩu + 8 món thịt + 4 rau + 4 tinh bột + 4 nước.',1199000,1,NULL),
(@cat_combo,'Combo 2 người - Premium Wagyu','2 nước lẩu + Wagyu/Prime + hải sản + rau + tinh bột + 2 nước.',899000,1,NULL),
(@cat_combo,'Combo 2 người - Seafood Lover','2 nước lẩu + 6 hải sản + rau + tinh bột + 2 nước.',799000,1,NULL),
(@cat_combo,'Combo 2 người - Veggie Light','2 nước lẩu + 8 rau/nấm + tinh bột + 2 nước.',549000,1,NULL),
(@cat_combo,'Combo Trẻ em - Kids','1 nước lẩu + 3 món dễ ăn + tinh bột + 1 nước.',329000,1,NULL),
(@cat_combo,'Combo Tiệc 6 người - Party','2 nước lẩu + 12 món (thịt/hải sản/viên) + 6 rau + 6 tinh bột + 6 nước.',1799000,1,NULL)
ON DUPLICATE KEY UPDATE
  price=VALUES(price), is_active=VALUES(is_active), description=VALUES(description);

-- Resolve needed item ids
SELECT item_id INTO @broth_sichuan FROM menu_items WHERE category_id=@cat_broth AND item_name='Nước lẩu Tứ Xuyên (cay)' LIMIT 1;
SELECT item_id INTO @broth_bone    FROM menu_items WHERE category_id=@cat_broth AND item_name='Nước lẩu Xương hầm' LIMIT 1;
SELECT item_id INTO @beef_us       FROM menu_items WHERE category_id=@cat_beef  AND item_name='Bò Mỹ thái mỏng (Short Plate)' LIMIT 1;
SELECT item_id INTO @beef_brisket  FROM menu_items WHERE category_id=@cat_beef  AND item_name='Bắp bò (Brisket)' LIMIT 1;
SELECT item_id INTO @pork_belly    FROM menu_items WHERE category_id=@cat_pork  AND item_name='Ba chỉ heo' LIMIT 1;
SELECT item_id INTO @lamb_slice    FROM menu_items WHERE category_id=@cat_lamb  AND item_name='Cừu Úc thái mỏng' LIMIT 1;
SELECT item_id INTO @veg_enoki     FROM menu_items WHERE category_id=@cat_veg   AND item_name='Nấm kim châm' LIMIT 1;
SELECT item_id INTO @veg_cabbage   FROM menu_items WHERE category_id=@cat_veg   AND item_name='Cải thảo' LIMIT 1;
SELECT item_id INTO @noodle_fresh  FROM menu_items WHERE category_id=@cat_noodle AND item_name='Mì tươi' LIMIT 1;
SELECT item_id INTO @noodle_udon   FROM menu_items WHERE category_id=@cat_noodle AND item_name='Udon' LIMIT 1;
SELECT item_id INTO @drink_coke    FROM menu_items WHERE category_id=@cat_drink AND item_name='Coca' LIMIT 1;
SELECT item_id INTO @drink_water   FROM menu_items WHERE category_id=@cat_drink AND item_name='Nước suối' LIMIT 1;
SELECT item_id INTO @drink_lemon   FROM menu_items WHERE category_id=@cat_drink AND item_name='Trà chanh' LIMIT 1;

SELECT item_id INTO @broth_tomyum  FROM menu_items WHERE category_id=@cat_broth AND item_name='Nước lẩu Tom Yum' LIMIT 1;
SELECT item_id INTO @broth_mush    FROM menu_items WHERE category_id=@cat_broth AND item_name='Nước lẩu Nấm' LIMIT 1;
SELECT item_id INTO @broth_tomato  FROM menu_items WHERE category_id=@cat_broth AND item_name='Nước lẩu Cà chua' LIMIT 1;

SELECT item_id INTO @beef_ribeye   FROM menu_items WHERE category_id=@cat_beef AND item_name='Ribeye bò Mỹ' LIMIT 1;
SELECT item_id INTO @beef_tender   FROM menu_items WHERE category_id=@cat_beef AND item_name='Thăn nội (Tenderloin)' LIMIT 1;
SELECT item_id INTO @beef_wagyuA5  FROM menu_items WHERE category_id=@cat_beef AND item_name='Wagyu A5 (Limited)' LIMIT 1;

SELECT item_id INTO @sea_shrimp    FROM menu_items WHERE category_id=@cat_sea AND item_name='Tôm sú' LIMIT 1;
SELECT item_id INTO @sea_squid     FROM menu_items WHERE category_id=@cat_sea AND item_name='Mực ống' LIMIT 1;
SELECT item_id INTO @sea_scallop   FROM menu_items WHERE category_id=@cat_sea AND item_name='Sò điệp' LIMIT 1;
SELECT item_id INTO @sea_oyster    FROM menu_items WHERE category_id=@cat_sea AND item_name='Hàu sữa' LIMIT 1;

SELECT item_id INTO @ball_cheese   FROM menu_items WHERE category_id=@cat_ball AND item_name='Bò viên phô mai' LIMIT 1;
SELECT item_id INTO @ball_dumpling FROM menu_items WHERE category_id=@cat_ball AND item_name='Há cảo tôm' LIMIT 1;

SELECT item_id INTO @veg_shiitake  FROM menu_items WHERE category_id=@cat_veg AND item_name='Nấm đông cô' LIMIT 1;
SELECT item_id INTO @veg_tofu      FROM menu_items WHERE category_id=@cat_veg AND item_name='Đậu hũ non' LIMIT 1;

SELECT item_id INTO @noodle_pho    FROM menu_items WHERE category_id=@cat_noodle AND item_name='Bánh phở' LIMIT 1;

-- Create combo_sets rows
SELECT item_id INTO @combo_solo_item FROM menu_items WHERE category_id=@cat_combo AND item_name='Combo 1 người - Solo' LIMIT 1;
SELECT item_id INTO @combo_sig_item  FROM menu_items WHERE category_id=@cat_combo AND item_name='Combo 2 người - Signature' LIMIT 1;
SELECT item_id INTO @combo_fam_item  FROM menu_items WHERE category_id=@cat_combo AND item_name='Combo 4 người - Family' LIMIT 1;
SELECT item_id INTO @combo_wagyu_item FROM menu_items WHERE category_id=@cat_combo AND item_name='Combo 2 người - Premium Wagyu' LIMIT 1;
SELECT item_id INTO @combo_sea_item   FROM menu_items WHERE category_id=@cat_combo AND item_name='Combo 2 người - Seafood Lover' LIMIT 1;
SELECT item_id INTO @combo_veg_item   FROM menu_items WHERE category_id=@cat_combo AND item_name='Combo 2 người - Veggie Light' LIMIT 1;
SELECT item_id INTO @combo_kids_item  FROM menu_items WHERE category_id=@cat_combo AND item_name='Combo Trẻ em - Kids' LIMIT 1;
SELECT item_id INTO @combo_party_item FROM menu_items WHERE category_id=@cat_combo AND item_name='Combo Tiệc 6 người - Party' LIMIT 1;

INSERT INTO combo_sets(combo_item_id, serve_for, allow_customization)
VALUES
(@combo_solo_item,1,1),
(@combo_sig_item,2,1),
(@combo_fam_item,4,1),
(@combo_wagyu_item,2,1),
(@combo_sea_item,2,1),
(@combo_veg_item,2,1),
(@combo_kids_item,1,1),
(@combo_party_item,6,1)
ON DUPLICATE KEY UPDATE
  serve_for=VALUES(serve_for), allow_customization=VALUES(allow_customization);

SELECT combo_id INTO @combo_solo FROM combo_sets WHERE combo_item_id=@combo_solo_item LIMIT 1;
SELECT combo_id INTO @combo_sig  FROM combo_sets WHERE combo_item_id=@combo_sig_item LIMIT 1;
SELECT combo_id INTO @combo_fam  FROM combo_sets WHERE combo_item_id=@combo_fam_item LIMIT 1;
SELECT combo_id INTO @combo_wagyu FROM combo_sets WHERE combo_item_id=@combo_wagyu_item LIMIT 1;
SELECT combo_id INTO @combo_sea   FROM combo_sets WHERE combo_item_id=@combo_sea_item LIMIT 1;
SELECT combo_id INTO @combo_veg   FROM combo_sets WHERE combo_item_id=@combo_veg_item LIMIT 1;
SELECT combo_id INTO @combo_kids  FROM combo_sets WHERE combo_item_id=@combo_kids_item LIMIT 1;
SELECT combo_id INTO @combo_party FROM combo_sets WHERE combo_item_id=@combo_party_item LIMIT 1;

-- Combo composition (minimal but meaningful)
INSERT INTO combo_set_items(combo_id, item_id, quantity, group_name, is_required, sort_order)
VALUES
(@combo_solo,@broth_bone,1,'Nước lẩu',1,1),
(@combo_solo,@beef_us,1,'Thịt',1,2),
(@combo_solo,@pork_belly,1,'Thịt',1,3),
(@combo_solo,@veg_enoki,1,'Rau & Nấm',1,4),
(@combo_solo,@noodle_fresh,1,'Tinh bột',1,5),
(@combo_solo,@drink_water,1,'Nước uống',1,6),

(@combo_sig,@broth_sichuan,1,'Nước lẩu',1,1),
(@combo_sig,@broth_bone,1,'Nước lẩu',1,2),
(@combo_sig,@beef_us,1,'Thịt',1,3),
(@combo_sig,@beef_brisket,1,'Thịt',1,4),
(@combo_sig,@pork_belly,1,'Thịt',1,5),
(@combo_sig,@lamb_slice,1,'Thịt',1,6),
(@combo_sig,@veg_enoki,1,'Rau & Nấm',1,7),
(@combo_sig,@veg_cabbage,1,'Rau & Nấm',1,8),
(@combo_sig,@noodle_fresh,1,'Tinh bột',1,9),
(@combo_sig,@noodle_udon,1,'Tinh bột',1,10),
(@combo_sig,@drink_coke,1,'Nước uống',1,11),
(@combo_sig,@drink_water,1,'Nước uống',1,12),

(@combo_fam,@broth_sichuan,1,'Nước lẩu',1,1),
(@combo_fam,@broth_bone,1,'Nước lẩu',1,2),
(@combo_fam,@beef_us,2,'Thịt',1,3),
(@combo_fam,@beef_brisket,2,'Thịt',1,4),
(@combo_fam,@pork_belly,2,'Thịt',1,5),
(@combo_fam,@lamb_slice,2,'Thịt',1,6),
(@combo_fam,@veg_enoki,2,'Rau & Nấm',1,7),
(@combo_fam,@veg_cabbage,2,'Rau & Nấm',1,8),
(@combo_fam,@noodle_fresh,2,'Tinh bột',1,9),
(@combo_fam,@noodle_udon,2,'Tinh bột',1,10),
(@combo_fam,@drink_coke,2,'Nước uống',1,11),
(@combo_fam,@drink_water,2,'Nước uống',1,12),

(@combo_wagyu,@broth_sichuan,1,'Nước lẩu',1,1),
(@combo_wagyu,@broth_tomato,1,'Nước lẩu',1,2),
(@combo_wagyu,@beef_wagyuA5,1,'Thịt',1,3),
(@combo_wagyu,@beef_ribeye,1,'Thịt',1,4),
(@combo_wagyu,@beef_tender,1,'Thịt',1,5),
(@combo_wagyu,@sea_scallop,1,'Hải sản',1,6),
(@combo_wagyu,@veg_shiitake,1,'Rau & Nấm',1,7),
(@combo_wagyu,@veg_tofu,1,'Rau & Nấm',1,8),
(@combo_wagyu,@noodle_pho,1,'Tinh bột',1,9),
(@combo_wagyu,@drink_lemon,1,'Nước uống',1,10),
(@combo_wagyu,@drink_water,1,'Nước uống',1,11),

(@combo_sea,@broth_tomyum,1,'Nước lẩu',1,1),
(@combo_sea,@broth_mush,1,'Nước lẩu',1,2),
(@combo_sea,@sea_shrimp,1,'Hải sản',1,3),
(@combo_sea,@sea_squid,1,'Hải sản',1,4),
(@combo_sea,@sea_scallop,1,'Hải sản',1,5),
(@combo_sea,@sea_oyster,1,'Hải sản',1,6),
(@combo_sea,@ball_dumpling,1,'Viên & Há cảo',1,7),
(@combo_sea,@veg_enoki,1,'Rau & Nấm',1,8),
(@combo_sea,@noodle_pho,1,'Tinh bột',1,9),
(@combo_sea,@drink_lemon,1,'Nước uống',1,10),
(@combo_sea,@drink_water,1,'Nước uống',1,11),

(@combo_veg,@broth_mush,1,'Nước lẩu',1,1),
(@combo_veg,@broth_tomato,1,'Nước lẩu',1,2),
(@combo_veg,@veg_enoki,2,'Rau & Nấm',1,3),
(@combo_veg,@veg_shiitake,2,'Rau & Nấm',1,4),
(@combo_veg,@veg_cabbage,2,'Rau & Nấm',1,5),
(@combo_veg,@veg_tofu,2,'Rau & Nấm',1,6),
(@combo_veg,@noodle_fresh,1,'Tinh bột',1,7),
(@combo_veg,@drink_lemon,2,'Nước uống',1,8),

(@combo_kids,@broth_bone,1,'Nước lẩu',1,1),
(@combo_kids,@beef_us,1,'Thịt',1,2),
(@combo_kids,@ball_cheese,1,'Viên & Há cảo',1,3),
(@combo_kids,@noodle_fresh,1,'Tinh bột',1,4),
(@combo_kids,@drink_water,1,'Nước uống',1,5),

(@combo_party,@broth_sichuan,1,'Nước lẩu',1,1),
(@combo_party,@broth_bone,1,'Nước lẩu',1,2),
(@combo_party,@beef_us,3,'Thịt',1,3),
(@combo_party,@beef_brisket,2,'Thịt',1,4),
(@combo_party,@pork_belly,3,'Thịt',1,5),
(@combo_party,@lamb_slice,2,'Thịt',1,6),
(@combo_party,@sea_shrimp,2,'Hải sản',1,7),
(@combo_party,@sea_squid,2,'Hải sản',1,8),
(@combo_party,@ball_cheese,2,'Viên & Há cảo',1,9),
(@combo_party,@ball_dumpling,2,'Viên & Há cảo',1,10),
(@combo_party,@veg_enoki,3,'Rau & Nấm',1,11),
(@combo_party,@veg_cabbage,3,'Rau & Nấm',1,12),
(@combo_party,@noodle_fresh,3,'Tinh bột',1,13),
(@combo_party,@noodle_udon,3,'Tinh bột',1,14),
(@combo_party,@drink_coke,3,'Nước uống',1,15),
(@combo_party,@drink_water,3,'Nước uống',1,16)
ON DUPLICATE KEY UPDATE
  quantity=VALUES(quantity), group_name=VALUES(group_name), is_required=VALUES(is_required), sort_order=VALUES(sort_order);

-- ===== MEAT PROFILES =====
INSERT INTO meat_profiles(item_id, meat_kind, cut, origin, portion_grams, marbling_level)
SELECT item_id,'BEEF','Short Plate','USA',150,3 FROM menu_items WHERE category_id=@cat_beef AND item_name='Bò Mỹ thái mỏng (Short Plate)'
UNION ALL SELECT item_id,'BEEF','Brisket','AUS',150,2 FROM menu_items WHERE category_id=@cat_beef AND item_name='Bắp bò (Brisket)'
UNION ALL SELECT item_id,'BEEF','Deckle','AUS',150,3 FROM menu_items WHERE category_id=@cat_beef AND item_name='Gầu bò'
UNION ALL SELECT item_id,'BEEF','Flank','AUS',150,2 FROM menu_items WHERE category_id=@cat_beef AND item_name='Nạm bò'
UNION ALL SELECT item_id,'BEEF','Tendon','AUS',200,NULL FROM menu_items WHERE category_id=@cat_beef AND item_name='Gân bò'
UNION ALL SELECT item_id,'BEEF','Wagyu Striploin','JPN',150,4 FROM menu_items WHERE category_id=@cat_beef AND item_name='Thăn bò Wagyu (Premium)'
UNION ALL SELECT item_id,'BEEF','Chuck Roll','USA',150,3 FROM menu_items WHERE category_id=@cat_beef AND item_name='Lõi vai (Chuck Roll)'
UNION ALL SELECT item_id,'BEEF','Striploin','USA',150,3 FROM menu_items WHERE category_id=@cat_beef AND item_name='Thăn ngoại (Striploin)'
UNION ALL SELECT item_id,'BEEF','Ribeye','USA',150,4 FROM menu_items WHERE category_id=@cat_beef AND item_name='Ribeye bò Mỹ'
UNION ALL SELECT item_id,'BEEF','Skirt Steak','USA',150,2 FROM menu_items WHERE category_id=@cat_beef AND item_name='Diềm thăn (Skirt Steak)'
UNION ALL SELECT item_id,'BEEF','Beef Tongue','USA',150,NULL FROM menu_items WHERE category_id=@cat_beef AND item_name='Lưỡi bò thái lát'
UNION ALL SELECT item_id,'BEEF','Tripe','AUS',200,NULL FROM menu_items WHERE category_id=@cat_beef AND item_name='Sách bò'
UNION ALL SELECT item_id,'BEEF','Honeycomb Tripe','AUS',200,NULL FROM menu_items WHERE category_id=@cat_beef AND item_name='Lá sách bò'
UNION ALL SELECT item_id,'BEEF','Heart','AUS',200,NULL FROM menu_items WHERE category_id=@cat_beef AND item_name='Tim bò'
UNION ALL SELECT item_id,'BEEF','Oxtail','AUS',300,NULL FROM menu_items WHERE category_id=@cat_beef AND item_name='Đuôi bò'
UNION ALL SELECT item_id,'BEEF','Tenderloin','USA',150,3 FROM menu_items WHERE category_id=@cat_beef AND item_name='Thăn nội (Tenderloin)'
UNION ALL SELECT item_id,'BEEF','Beef Tongue Premium','USA',150,NULL FROM menu_items WHERE category_id=@cat_beef AND item_name='Beef Tongue Premium'
UNION ALL SELECT item_id,'BEEF','Wagyu A5','JPN',120,5 FROM menu_items WHERE category_id=@cat_beef AND item_name='Wagyu A5 (Limited)'

UNION ALL SELECT item_id,'PORK','Pork Belly','VN',180,NULL FROM menu_items WHERE category_id=@cat_pork AND item_name='Ba chỉ heo'
UNION ALL SELECT item_id,'PORK','Shoulder','VN',180,NULL FROM menu_items WHERE category_id=@cat_pork AND item_name='Nạc vai heo'
UNION ALL SELECT item_id,'PORK','Iberico','ESP',160,3 FROM menu_items WHERE category_id=@cat_pork AND item_name='Heo Iberico (Premium)'
UNION ALL SELECT item_id,'PORK','Ribs','VN',250,NULL FROM menu_items WHERE category_id=@cat_pork AND item_name='Sườn non'
UNION ALL SELECT item_id,'PORK','Neck','VN',180,NULL FROM menu_items WHERE category_id=@cat_pork AND item_name='Cổ heo thái mỏng'
UNION ALL SELECT item_id,'PORK','Shank','VN',200,NULL FROM menu_items WHERE category_id=@cat_pork AND item_name='Bắp heo'
UNION ALL SELECT item_id,'PORK','Pig Ear','VN',200,NULL FROM menu_items WHERE category_id=@cat_pork AND item_name='Tai heo'
UNION ALL SELECT item_id,'PORK','Cartilage Ribs','VN',250,NULL FROM menu_items WHERE category_id=@cat_pork AND item_name='Sườn sụn'

UNION ALL SELECT item_id,'LAMB','Lamb Slices','AUS',150,NULL FROM menu_items WHERE category_id=@cat_lamb AND item_name='Cừu Úc thái mỏng'
UNION ALL SELECT item_id,'LAMB','Lamb Ribs','AUS',250,NULL FROM menu_items WHERE category_id=@cat_lamb AND item_name='Sườn cừu'
UNION ALL SELECT item_id,'LAMB','Lamb Roll','AUS',150,NULL FROM menu_items WHERE category_id=@cat_lamb AND item_name='Cừu cuộn nấm'
UNION ALL SELECT item_id,'LAMB','Lamb Hump','AUS',200,NULL FROM menu_items WHERE category_id=@cat_lamb AND item_name='Gù cừu'
UNION ALL SELECT item_id,'LAMB','Baby Lamb','AUS',150,NULL FROM menu_items WHERE category_id=@cat_lamb AND item_name='Cừu non (Baby Lamb)'
UNION ALL SELECT item_id,'LAMB','Lamb Rack Premium','AUS',250,NULL FROM menu_items WHERE category_id=@cat_lamb AND item_name='Sườn cừu Premium'
ON DUPLICATE KEY UPDATE
  meat_kind=VALUES(meat_kind), cut=VALUES(cut), origin=VALUES(origin), portion_grams=VALUES(portion_grams), marbling_level=VALUES(marbling_level);
