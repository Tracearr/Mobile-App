// ponytail: FlashList 2.0.3 RenderStackManager.sync asks for a key one past the end of a list that just shrank; drop the fallback once FlashList stops.
export function keyById(item: { id: string } | undefined, index: number): string {
  return item?.id ?? `missing-${index}`;
}
