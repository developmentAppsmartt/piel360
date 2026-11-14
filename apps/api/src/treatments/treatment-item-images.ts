import type { StorageService } from '../storage/storage.service';

/** Si imageUrl es un key de S3 (no empieza con http), genera URL firmada
 *  (1h) — mismo criterio que ProductsService#resolveImageUrl. */
export async function resolveItemImage<
  T extends { product: { imageUrl: string | null } },
>(storage: StorageService, item: T): Promise<T> {
  const { imageUrl } = item.product;
  if (
    !imageUrl ||
    imageUrl.startsWith('http://') ||
    imageUrl.startsWith('https://')
  ) {
    return item;
  }
  const signedUrl = await storage.getSignedUrl(imageUrl);
  return { ...item, product: { ...item.product, imageUrl: signedUrl } };
}

export async function withResolvedItems<
  T extends { items: { product: { imageUrl: string | null } }[] },
>(storage: StorageService, treatment: T): Promise<T> {
  return {
    ...treatment,
    items: await Promise.all(
      treatment.items.map((i) => resolveItemImage(storage, i)),
    ),
  };
}
