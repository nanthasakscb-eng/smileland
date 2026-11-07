-- คืนรูปปกการ์ดประกาศ (cover_key ถูกล้างเมื่อ 6 พ.ย. 2569) จากรูปแรกในตาราง listing_images
UPDATE listings
SET cover_key = (SELECT li.key_base || ':' || li.ext FROM listing_images li WHERE li.listing_id = listings.id ORDER BY li.idx LIMIT 1)
WHERE cover_key IS NULL
  AND EXISTS (SELECT 1 FROM listing_images li WHERE li.listing_id = listings.id);
UPDATE listings
SET image_count = (SELECT count(*) FROM listing_images li WHERE li.listing_id = listings.id)
WHERE image_count = 0
  AND EXISTS (SELECT 1 FROM listing_images li WHERE li.listing_id = listings.id);
