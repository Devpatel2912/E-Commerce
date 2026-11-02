import pool from "../config/db.js";
import { LISTING_IMAGE_STATUS } from "../constants/status.constants.js";

export const createListingImage = async ({
    listingId,
    objectKey = null,
    contentType = null,
    fileSize = null,
    imageUrl = null,
    isPrimary = false,
    status = LISTING_IMAGE_STATUS.COMPLETED,
}) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        if (isPrimary) {
            await client.query(
                `UPDATE listing_images SET is_primary = FALSE WHERE listing_id = $1`,
                [listingId],
            );
        }

        const query = `
      INSERT INTO listing_images
        (listing_id, object_key, content_type, file_size, image_url, is_primary, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING image_id, listing_id, object_key, content_type, file_size, image_url, is_primary, status, created_at
    `;

        const { rows } = await client.query(query, [
            listingId,
            objectKey,
            contentType,
            fileSize,
            imageUrl,
            isPrimary,
            status,
        ]);

        await client.query("COMMIT");
        return rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const updateListingImageProcessing = async (
    imageId,
    { status, isPrimary, fileSize, contentType },
) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        if (isPrimary) {
            const { rows: imgRows } = await client.query(
                "SELECT listing_id FROM listing_images WHERE image_id = $1",
                [imageId],
            );
            if (imgRows[0]) {
                await client.query(
                    `UPDATE listing_images SET is_primary = FALSE WHERE listing_id = $1`,
                    [imgRows[0].listing_id],
                );
            }
        }

        const fields = ["status = $1"];
        const values = [status];
        let idx = 2;

        if (isPrimary !== undefined) {
            fields.push(`is_primary = $${idx++}`);
            values.push(isPrimary);
        }
        if (fileSize !== undefined) {
            fields.push(`file_size = $${idx++}`);
            values.push(fileSize);
        }
        if (contentType !== undefined) {
            fields.push(`content_type = $${idx++}`);
            values.push(contentType);
        }

        values.push(imageId);

        const query = `
            UPDATE listing_images
            SET ${fields.join(", ")}
            WHERE image_id = $${idx}
            RETURNING image_id, listing_id, object_key, content_type, file_size, image_url, is_primary, status, created_at
        `;

        const { rows } = await client.query(query, values);
        await client.query("COMMIT");
        return rows[0] ?? null;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const getListingImages = async (listingId, includePending = false) => {
    let query = `
    SELECT image_id, listing_id, object_key, content_type, file_size, image_url, is_primary, status, created_at
    FROM listing_images
    WHERE listing_id = $1
  `;

    if (!includePending) {
        query += ` AND status = '${LISTING_IMAGE_STATUS.COMPLETED}'`;
    }

    query += ` ORDER BY is_primary DESC, created_at ASC;`;

    const { rows } = await pool.query(query, [listingId]);
    return rows;
};

export const getListingImageById = async (imageId, listingId = null) => {
    const resolvedImageId = imageId;

    if (listingId !== null && Number(imageId) > 0 && Number(listingId) > 0) {
        const query = `
      SELECT image_id, listing_id, object_key, content_type, file_size, image_url, is_primary, created_at
      FROM listing_images
      WHERE (image_id = $1 AND listing_id = $2)
         OR (image_id = $2 AND listing_id = $1)
      LIMIT 1
    `;
        const { rows } = await pool.query(query, [imageId, listingId]);
        return rows[0] ?? null;
    }

    const query = `
    SELECT image_id, listing_id, object_key, content_type, file_size, image_url, is_primary, created_at
    FROM listing_images
    WHERE image_id = $1
    LIMIT 1
  `;

    const { rows } = await pool.query(query, [resolvedImageId]);
    return rows[0] ?? null;
};

export const getListingImageByObjectKey = async (objectKey) => {
    const query = `
    SELECT image_id, listing_id, object_key, content_type, file_size, image_url, is_primary, created_at
    FROM listing_images
    WHERE object_key = $1
    LIMIT 1
  `;

    const { rows } = await pool.query(query, [objectKey]);
    return rows[0] ?? null;
};

export const countListingImages = async (listingId) => {
    const query = `
    SELECT COUNT(*)::int AS count
    FROM listing_images
    WHERE listing_id = $1
  `;

    const { rows } = await pool.query(query, [listingId]);
    return rows[0]?.count ?? 0;
};

export const deleteListingImage = async (imageId, listingId = null) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        let selectQuery = `SELECT * FROM listing_images WHERE image_id = $1`;
        let selectParams = [imageId];

        if (listingId !== null) {
            selectQuery = `
        SELECT * FROM listing_images
        WHERE (image_id = $1 AND listing_id = $2)
           OR (image_id = $2 AND listing_id = $1)
      `;
            selectParams = [imageId, listingId];
        }

        const existingRes = await client.query(selectQuery, selectParams);
        const existing = existingRes.rows[0];

        if (!existing) {
            await client.query("ROLLBACK");
            return null;
        }

        const deleteQuery = `
      DELETE FROM listing_images
      WHERE image_id = $1
      RETURNING image_id, listing_id, object_key, content_type, file_size, image_url, is_primary, created_at
    `;
        const { rows } = await client.query(deleteQuery, [existing.image_id]);
        const deletedImage = rows[0];

        if (existing.is_primary) {
            await client.query(
                `
        UPDATE listing_images
        SET is_primary = TRUE
        WHERE image_id = (
          SELECT image_id FROM listing_images
          WHERE listing_id = $1
          ORDER BY created_at ASC
          LIMIT 1
        )
      `,
                [existing.listing_id],
            );
        }

        await client.query("COMMIT");
        return deletedImage;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};
