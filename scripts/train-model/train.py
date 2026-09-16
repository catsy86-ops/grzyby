"""Trening modelu rozpoznawania gatunków grzybów (transfer learning na MobileNetV2) i eksport
do formatu Keras H5, gotowego do konwersji na TensorFlow.js zgodnie z docs/MODEL-TRAINING.md.

Wymaga: Python 3.10+, `pip install -r requirements.txt` (TensorFlow + tensorflowjs).
Nie jest uruchamiany automatycznie w tym repo - to narzędzie do lokalnego użycia przez osobę
z zebranym i skuratowanym zbiorem zdjęć (patrz scripts/prepare-dataset/README.md).

Użycie:
    python scripts/train-model/train.py --epochs 15 --fine-tune-epochs 5

Oczekiwana struktura danych:
    dataset/
      borowik-szlachetny/*.jpg
      goryczak-zolciowy/*.jpg
      ...  (jeden podkatalog na każdy `id` ze src/data/species.json, min. kilkadziesiąt zdjęć)
      inne/*.jpg  (opcjonalnie - klasa negatywna "to nie grzyb", patrz
                   scripts/prepare-dataset/fetch-negative-images.mjs)

WAŻNE - musi się zgadzać z preprocessingiem w src/utils/mushroomModel.ts:
  - rozmiar wejścia: 224x224 RGB
  - normalizacja wejścia modelu: [0, 1] (dzielenie przez 255) - ten skrypt wbudowuje przesunięcie
    do zakresu oczekiwanego przez MobileNetV2 (Rescaling do [-1,1]) WEWNĄTRZ eksportowanego modelu,
    więc kod w przeglądarce nie musi nic wiedzieć o wewnętrznych detalach MobileNetV2.
  - kolejność klas wyjściowych = kolejność `id` w src/data/species.json (skrypt to wymusza i
    wypisuje na końcu do weryfikacji).
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

IMAGE_SIZE = (224, 224)
REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
SPECIES_JSON = REPO_ROOT / "src" / "data" / "species.json"
REVIEWED_DIR = REPO_ROOT / "scripts" / "prepare-dataset" / "reviewed"

# Rekomendowane minimum ze scripts/prepare-dataset/README.md - poniżej tego prawdopodobnie
# zbyt niepewny model. Trening wciąż można wymusić przez --allow-small-dataset, ale świadomie,
# nie przez przeoczenie.
MIN_IMAGES_PER_CLASS = 30

NEGATIVE_CLASS = "inne"


def check_review_gate(dataset_dir: pathlib.Path, class_names: list[str], allow_small_dataset: bool) -> list[str]:
    """Odmawia treningu na klasie bez manifestu ręcznej recenzji (scripts/prepare-dataset/
    review-gate.mjs) lub z podejrzanie małą liczbą zdjęć - to jest gate na dokładnie ten błąd,
    który już raz się zdarzył w tym repo (model wytrenowany i wdrożony na zdjęciach, które przeszły
    tylko przez sanity-filter.mjs, filtr czysto techniczny, bez jakiejkolwiek weryfikacji gatunku).
    Zwraca listę komunikatów błędów (pusta = wszystko OK)."""
    errors = []
    for class_name in class_names:
        manifest_path = REVIEWED_DIR / f"{class_name}.json"
        if not manifest_path.is_file():
            errors.append(
                f"{class_name}: brak manifestu recenzji {manifest_path.relative_to(REPO_ROOT)} - "
                "uruchom scripts/prepare-dataset/review-gate.mjs po ręcznym przejrzeniu zdjęć."
            )
            continue
        count = len(list((dataset_dir / class_name).glob("*")))
        if count < MIN_IMAGES_PER_CLASS and not allow_small_dataset:
            errors.append(
                f"{class_name}: tylko {count} zrecenzjonowanych zdjęć (minimum {MIN_IMAGES_PER_CLASS}) - "
                "zbierz więcej albo uruchom z --allow-small-dataset, świadomie akceptując ryzyko."
            )
    return errors


def load_class_order(dataset_dir: pathlib.Path) -> list[str]:
    species = json.loads(SPECIES_JSON.read_text(encoding="utf-8"))
    class_names = [s["id"] for s in species]
    # Klasa negatywna "inne" (nie-grzyb) jest opcjonalna - dołączana tylko jeśli ktoś faktycznie
    # przygotował dla niej dane (patrz scripts/prepare-dataset/fetch-negative-images.mjs). Zawsze
    # na końcu listy, żeby nie przesuwać indeksów pozostałych 19 klas względem species.json.
    if (dataset_dir / NEGATIVE_CLASS).is_dir():
        class_names.append(NEGATIVE_CLASS)
    return class_names


def build_datasets(dataset_dir: pathlib.Path, class_names: list[str], batch_size: int, val_split: float):
    common_kwargs = dict(
        directory=str(dataset_dir),
        labels="inferred",
        label_mode="categorical",
        class_names=class_names,
        image_size=IMAGE_SIZE,
        batch_size=batch_size,
        seed=42,
    )
    train_ds = keras.utils.image_dataset_from_directory(validation_split=val_split, subset="training", **common_kwargs)
    val_ds = keras.utils.image_dataset_from_directory(validation_split=val_split, subset="validation", **common_kwargs)

    augment = keras.Sequential(
        [
            layers.RandomFlip("horizontal"),
            layers.RandomRotation(0.08),
            layers.RandomZoom(0.1),
            layers.RandomContrast(0.1),
        ]
    )

    def normalize(x, y):
        return x / 255.0, y

    train_ds = (
        train_ds.map(normalize)
        .map(lambda x, y: (augment(x, training=True), y))
        .prefetch(tf.data.AUTOTUNE)
    )
    val_ds = val_ds.map(normalize).prefetch(tf.data.AUTOTUNE)
    return train_ds, val_ds


def compute_class_weights(dataset_dir: pathlib.Path, class_names: list[str]) -> dict[int, float]:
    """Wagi odwrotnie proporcjonalne do liczebności klasy (standardowy wzór
    n_samples / (n_classes * n_samples_w_klasie)) - w tym repo klasa negatywna "inne" ma
    historycznie ~3x więcej zdjęć niż pojedynczy gatunek (patrz fetch-negative-images.mjs), co bez
    tej korekty ciągnie model w stronę nadmiernego rozpoznawania "to nie grzyb" kosztem rzadszych
    klas - przy klasyfikatorze bezpieczeństwa niepożądane w obie strony (zarówno ukrywanie realnych
    trafień, jak i odwrotnie)."""
    counts = {name: len(list((dataset_dir / name).glob("*"))) for name in class_names}
    total = sum(counts.values())
    num_classes = len(class_names)
    return {i: total / (num_classes * counts[name]) for i, name in enumerate(class_names) if counts[name] > 0}


def build_model(num_classes: int) -> keras.Model:
    inputs = keras.Input(shape=(*IMAGE_SIZE, 3), name="image")
    # Wejście to [0,1], dokładnie jak preprocessing w mushroomModel.ts (fromPixels -> resize -> /255).
    # MobileNetV2 oczekuje [-1,1] - to przesunięcie jest częścią eksportowanego modelu.
    x = layers.Rescaling(2.0, offset=-1.0)(inputs)
    base_model = keras.applications.MobileNetV2(
        input_shape=(*IMAGE_SIZE, 3), include_top=False, weights="imagenet"
    )
    base_model.trainable = False
    x = base_model(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.2)(x)
    outputs = layers.Dense(num_classes, activation="softmax", name="predictions")(x)

    model = keras.Model(inputs, outputs)
    model.mushroom_base_model = base_model  # referencja do późniejszego fine-tuningu
    return model


def fit_temperature(probs: "np.ndarray", y_true: "np.ndarray") -> float:
    """Dopasowuje skalar T minimalizujący negative log-likelihood na zbiorze walidacyjnym -
    standardowe "temperature scaling" (Guo i in., 2017) do kalibracji pewności sieci neuronowych.
    Siatka + wybór minimum zamiast optymalizatora gradientowego - wystarczająco dokładne dla
    jednego skalara, bez dodatkowej zależności od scipy.optimize. Ten sam wzór
    softmax(log(p)/T) jest zaimplementowany w JS w src/utils/mushroomModel.ts (applyTemperature) -
    zmiana jednego bez drugiego rozjeżdża kalibrację między treningiem a przeglądarką."""
    log_probs = np.log(np.clip(probs, 1e-12, 1.0))
    candidates = np.linspace(0.3, 5.0, 200)
    best_t, best_nll = 1.0, float("inf")
    for t in candidates:
        scaled = log_probs / t
        scaled -= scaled.max(axis=1, keepdims=True)
        exp = np.exp(scaled)
        softmax = exp / exp.sum(axis=1, keepdims=True)
        true_probs = softmax[np.arange(len(y_true)), y_true]
        nll = -np.mean(np.log(np.clip(true_probs, 1e-12, 1.0)))
        if nll < best_nll:
            best_t, best_nll = float(t), float(nll)
    return best_t


def evaluate_and_report(
    model: keras.Model, val_ds: tf.data.Dataset, class_names: list[str], output_dir: pathlib.Path
) -> float:
    """Zapisuje classification_report (precision/recall/F1 per klasa) i confusion matrix na
    zbiorze walidacyjnym - bez tego jedynym sygnałem jakości modelu było "loss spadł podczas
    treningu", co przy klasyfikatorze jadalny/trujący jest zdecydowanie za mało, żeby ktokolwiek
    mógł ocenić, czy dany model nadaje się do wdrożenia."""
    from sklearn.metrics import ConfusionMatrixDisplay, classification_report

    y_true: list[int] = []
    y_pred: list[int] = []
    all_probs: list[np.ndarray] = []
    for batch_images, batch_labels in val_ds:
        batch_pred = model.predict(batch_images, verbose=0)
        y_true.extend(tf.argmax(batch_labels, axis=1).numpy().tolist())
        y_pred.extend(tf.argmax(batch_pred, axis=1).tolist())
        all_probs.append(np.asarray(batch_pred))

    report = classification_report(
        y_true, y_pred, labels=list(range(len(class_names))), target_names=class_names,
        output_dict=True, zero_division=0,
    )
    report_path = output_dir / "eval-report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Zapisano raport ewaluacji: {report_path}")
    print(f"  Dokładność ogólna (accuracy) na zbiorze walidacyjnym: {report['accuracy']:.2%}")

    # matplotlib bez GUI (Agg) - skrypt uruchamiany z konsoli/CI, nie ma X serwera/okna.
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(max(6, len(class_names) * 0.5), max(6, len(class_names) * 0.5)))
    ConfusionMatrixDisplay.from_predictions(
        y_true, y_pred, labels=list(range(len(class_names))), display_labels=class_names, ax=ax,
        xticks_rotation="vertical", colorbar=False,
    )
    fig.tight_layout()
    matrix_path = output_dir / "confusion-matrix.png"
    fig.savefig(matrix_path, dpi=150)
    plt.close(fig)
    print(f"Zapisano confusion matrix: {matrix_path}")
    print(
        "\nPrzed wdrożeniem modelu przejrzyj oba pliki - niska precision/recall na gatunku "
        "trującym (fałszywie rozpoznany jako jadalny) jest dużo poważniejszym problemem niż niska "
        "ogólna accuracy. Sam wynik accuracy łatwo zawyżyć nierównomiernym rozkładem klas."
    )

    temperature = fit_temperature(np.concatenate(all_probs, axis=0), np.array(y_true))
    print(f"Skalibrowana temperatura (temperature scaling): {temperature:.3f}")
    return temperature


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dataset", type=pathlib.Path, default=REPO_ROOT / "dataset")
    parser.add_argument("--output", type=pathlib.Path, default=REPO_ROOT / "model-export")
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--fine-tune-epochs", type=int, default=5)
    parser.add_argument("--val-split", type=float, default=0.2)
    parser.add_argument(
        "--allow-small-dataset",
        action="store_true",
        help="Pomija minimum MIN_IMAGES_PER_CLASS z check_review_gate (wciąż wymaga manifestu recenzji).",
    )
    args = parser.parse_args()

    class_names = load_class_order(args.dataset)
    missing = [c for c in class_names if not (args.dataset / c).is_dir()]
    if missing:
        print(f"Brakuje katalogów w {args.dataset} dla gatunków: {missing}", file=sys.stderr)
        print("Każdy `id` ze species.json musi mieć swój podkatalog ze zdjęciami.", file=sys.stderr)
        return 1

    review_errors = check_review_gate(args.dataset, class_names, args.allow_small_dataset)
    if review_errors:
        print("Dataset nie przeszedł bramki recenzji - trening przerwany:", file=sys.stderr)
        for error in review_errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    train_ds, val_ds = build_datasets(args.dataset, class_names, args.batch_size, args.val_split)
    class_weight = compute_class_weights(args.dataset, class_names)
    print("Wagi klas (korekta nierównomiernego rozkładu, patrz compute_class_weights):")
    for name, weight in zip(class_names, (class_weight.get(i, 1.0) for i in range(len(class_names)))):
        print(f"  {name}: {weight:.2f}")

    model = build_model(len(class_names))
    model.compile(optimizer=keras.optimizers.Adam(1e-3), loss="categorical_crossentropy", metrics=["accuracy"])

    print(f"Trening głowy klasyfikacyjnej ({args.epochs} epok, baza MobileNetV2 zamrożona)...")
    model.fit(train_ds, validation_data=val_ds, epochs=args.epochs, class_weight=class_weight)

    if args.fine_tune_epochs > 0:
        print(f"Fine-tuning ostatnich warstw MobileNetV2 ({args.fine_tune_epochs} epok)...")
        model.mushroom_base_model.trainable = True
        for layer in model.mushroom_base_model.layers[:-30]:
            layer.trainable = False
        model.compile(optimizer=keras.optimizers.Adam(1e-5), loss="categorical_crossentropy", metrics=["accuracy"])
        model.fit(train_ds, validation_data=val_ds, epochs=args.fine_tune_epochs, class_weight=class_weight)

    args.output.mkdir(parents=True, exist_ok=True)

    print("\nEwaluacja na zbiorze walidacyjnym...")
    temperature = evaluate_and_report(model, val_ds, class_names, args.output)

    keras_path = args.output / "model.h5"
    model.save(keras_path)
    print(f"\nZapisano model Keras: {keras_path}")

    # mushroomModel.ts (loadClassLabels) czyta ten plik z public/models/metadata.json, jeśli
    # istnieje - bez niego zakłada kolejność klas = species.json (19 pozycji), co nie obejmuje
    # dodatkowej klasy "inne" pod indeksem 19. Zapisujemy go zawsze, żeby kolejność klas była
    # jawna niezależnie od tego, czy klasa negatywna została użyta.
    metadata_path = args.output / "metadata.json"
    metadata_path.write_text(
        json.dumps({"labels": class_names, "temperature": temperature}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Zapisano metadata.json: {metadata_path}")

    print("\nKolejny krok - konwersja do TensorFlow.js (patrz docs/MODEL-TRAINING.md):")
    # UWAGA: `--quantize_uint8` bez `=1` łyka następny argument (ścieżkę modelu) jako swoją
    # wartość (nargs='?' w argparse tensorflowjs) i converter kończy błędem "Missing output_path
    # argument" - odkryte przy pierwszym realnym użyciu tego polecenia (Faza 20).
    print(f"  tensorflowjs_converter --input_format=keras --quantize_uint8=1 {keras_path} public/models")
    print(f"  cp {metadata_path} public/models/metadata.json")
    print(f"\nKolejność klas w wyjściu modelu (do weryfikacji ze species.json): {class_names}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
