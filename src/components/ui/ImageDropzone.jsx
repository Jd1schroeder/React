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
}) {
  const inputRef = useRef(null);
  const itemsRef = useRef([]);
  const [items, setItems] = useState([]);
  const [thumbnailKey, setThumbnailKey] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const getItemKey = (item) => `${item.file.name}-${item.file.size}-${item.file.lastModified}`;
  const notifyThumbnail = (next, preferredKey = thumbnailKey) => {
    const thumbnail = next.find((item) => getItemKey(item) === preferredKey) ?? next[0];
    setThumbnailKey(thumbnail ? getItemKey(thumbnail) : "");
    onThumbnailChange?.(thumbnail?.file ?? null);
  };

  useEffect(
    () => () => itemsRef.current.forEach(({ url }) => URL.revokeObjectURL(url)),
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
              item.file.name === file.name &&
              item.file.size === file.size &&
              item.file.lastModified === file.lastModified,
          ),
      )
      .map((file) => ({ file, url: URL.createObjectURL(file) }));
    const next = multiple ? [...currentItems, ...newItems] : newItems.slice(0, 1);
    if (!multiple)
      itemsRef.current
        .filter((item) => !next.includes(item))
        .forEach(({ url }) => URL.revokeObjectURL(url));
    itemsRef.current = next;
    setItems(next);
    onChange?.(next.map(({ file }) => file));
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
    URL.revokeObjectURL(itemToRemove.url);
    const next = itemsRef.current.filter((item) => item !== itemToRemove);
    itemsRef.current = next;
    setItems(next);
    onChange?.(next.map(({ file }) => file));
    notifyThumbnail(next);
  };

  const selectThumbnail = (item) => {
    const nextKey = getItemKey(item);
    setThumbnailKey(nextKey);
    onThumbnailChange?.(item.file);
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
              const { file, url } = item;
              return (
              <div
                className={`image-dropzone-preview${getItemKey(item) === thumbnailKey ? " is-thumbnail" : ""}`}
                key={`${file.name}-${file.lastModified}`}
                role="button"
                tabIndex="0"
                aria-pressed={getItemKey(item) === thumbnailKey}
                aria-label={`${file.name}${getItemKey(item) === thumbnailKey ? ", work order thumbnail" : ", select as work order thumbnail"}`}
                onClick={() => selectThumbnail(item)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectThumbnail(item); } }}
              >
                <img src={url} alt={file.name} />
                {getItemKey(item) !== thumbnailKey && (
                  <span className="image-dropzone-thumbnail-action">
                    Set as Thumbnail
                  </span>
                )}
                <button
                  type="button"
                  onClick={(event) => { event.stopPropagation(); removeFile(item); }}
                  aria-label={`Remove ${file.name}`}
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
