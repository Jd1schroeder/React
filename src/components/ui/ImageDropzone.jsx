import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import "./ImageDropzone.css";

const defaultAccept = "image/*";

function filterImageFiles(fileList, accept) {
  const acceptedTypes = accept
    .split(",")
    .map((type) => type.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(fileList ?? []).filter((file) =>
    acceptedTypes.some(
      (type) =>
        type === file.type.toLowerCase() ||
        (type.endsWith("/*") &&
          file.type.toLowerCase().startsWith(type.slice(0, -1))),
    ),
  );
}

export function ImageDropzone({
  label = "Pictures",
  accept = defaultAccept,
  multiple = true,
  onChange,
  onThumbnailChange,
  initialAttachments = [],
  onExistingAttachmentsChange,
  onExistingThumbnailChange,
  allowThumbnailSelection = true,
}) {
  const inputRef = useRef(null);
  const [items, setItems] = useState(() => initialAttachments.map((attachment) => ({
    id: attachment.id,
    name: attachment.file_name,
    url: attachment.signed_url,
    isExisting: true,
  })));
  const itemsRef = useRef(items);
  const [thumbnailKey, setThumbnailKey] = useState(() => {
    const selectedAttachment = initialAttachments.find((attachment) => attachment.is_thumbnail) ?? initialAttachments[0];
    return selectedAttachment ? `attachment:${selectedAttachment.id}` : "";
  });
  const [isDragging, setIsDragging] = useState(false);

  const getItemKey = (item) => item.isExisting
    ? `attachment:${item.id}`
    : `file:${item.file.name}-${item.file.size}-${item.file.lastModified}`;
  const notifyThumbnail = (next, preferredKey = thumbnailKey) => {
    onExistingAttachmentsChange?.(next.filter((item) => item.isExisting).map((item) => item.id));
    if (!allowThumbnailSelection) {
      onThumbnailChange?.(null);
      onExistingThumbnailChange?.(null);
      return;
    }
    const thumbnail = next.find((item) => getItemKey(item) === preferredKey) ?? next[0];
    setThumbnailKey(thumbnail ? getItemKey(thumbnail) : "");
    onThumbnailChange?.(thumbnail && !thumbnail.isExisting ? thumbnail.file : null);
    onExistingThumbnailChange?.(thumbnail?.isExisting ? thumbnail.id : null);
  };

  useEffect(
    () => () => itemsRef.current.filter((item) => !item.isExisting).forEach(({ url }) => URL.revokeObjectURL(url)),
    [],
  );

  const updateFiles = (fileList, append = true) => {
    const selectedFiles = filterImageFiles(fileList, accept);
    const currentItems = append && multiple ? itemsRef.current : [];
    const newItems = selectedFiles
      .filter(
        (file) =>
          !currentItems.some(
            (item) =>
              !item.isExisting &&
              item.file.name === file.name &&
              item.file.size === file.size &&
              item.file.lastModified === file.lastModified,
          ),
      )
      .map((file) => ({ file, name: file.name, url: URL.createObjectURL(file), isExisting: false }));
    const next = multiple ? [...currentItems, ...newItems] : newItems.slice(0, 1);
    if (!multiple) {
      itemsRef.current
        .filter((item) => !item.isExisting && !next.includes(item))
        .forEach(({ url }) => URL.revokeObjectURL(url));
    }
    itemsRef.current = next;
    setItems(next);
    onChange?.(next.filter((item) => !item.isExisting).map(({ file }) => file));
    notifyThumbnail(next);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    updateFiles(event.dataTransfer.files);
  };

  const handleInputChange = (event) => {
    updateFiles(event.target.files);
    event.target.value = "";
  };

  const removeFile = (itemToRemove) => {
    if (!itemToRemove.isExisting) URL.revokeObjectURL(itemToRemove.url);
    const next = itemsRef.current.filter((item) => item !== itemToRemove);
    itemsRef.current = next;
    setItems(next);
    onChange?.(next.filter((item) => !item.isExisting).map(({ file }) => file));
    notifyThumbnail(next);
  };

  const selectThumbnail = (item) => {
    if (!allowThumbnailSelection) return;
    const nextKey = getItemKey(item);
    setThumbnailKey(nextKey);
    onThumbnailChange?.(item.isExisting ? null : item.file);
    onExistingThumbnailChange?.(item.isExisting ? item.id : null);
  };

  return (
    <section className="image-dropzone-field">
      <label className="image-dropzone-label">{label}</label>
      <div
        className={`image-dropzone${isDragging ? " is-dragging" : ""}${items.length ? " has-files" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setIsDragging(false);
        }}
        onDrop={handleDrop}
      >
        {items.length > 0 && (
          <div className="image-dropzone-previews">
            {items.map((item) => {
              const { name, url } = item;
              const isSelectedThumbnail = getItemKey(item) === thumbnailKey;
              return (
              <div
                className={`image-dropzone-preview${allowThumbnailSelection && isSelectedThumbnail ? " is-thumbnail" : ""}`}
                key={getItemKey(item)}
                role={allowThumbnailSelection ? "button" : undefined}
                tabIndex={allowThumbnailSelection ? "0" : undefined}
                aria-pressed={allowThumbnailSelection ? isSelectedThumbnail : undefined}
                aria-label={allowThumbnailSelection ? `${name}${isSelectedThumbnail ? ", work order thumbnail" : ", select as work order thumbnail"}` : undefined}
                onClick={allowThumbnailSelection ? () => selectThumbnail(item) : undefined}
                onKeyDown={allowThumbnailSelection ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectThumbnail(item); } } : undefined}
              >
                {url ? <img src={url} alt={name} /> : <div className="image-dropzone-preview-unavailable" role="img" aria-label={`${name} preview unavailable`} />}
                {allowThumbnailSelection && !isSelectedThumbnail && (
                  <span className="image-dropzone-thumbnail-action">
                    Set as Thumbnail
                  </span>
                )}
                <button
                  type="button"
                  onClick={(event) => { event.stopPropagation(); removeFile(item); }}
                  aria-label={`Remove ${name}`}
                >
                  <X size={14} />
                </button>
              </div>
              );
            })}
          </div>
        )}
        {isDragging && (
          <div className="image-dropzone-overlay">
            <span>Release to attach</span>
          </div>
        )}
        {!isDragging && (
          <button
            type="button"
            className="image-dropzone-trigger"
            onClick={() => inputRef.current?.click()}
          >
            <Camera size={20} aria-hidden="true" />
            <span>
              {items.length ? "Add more pictures" : "Add or drag pictures"}
            </span>
          </button>
        )}
        <input
          ref={inputRef}
          className="image-dropzone-input"
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
        />
      </div>
    </section>
  );
}
