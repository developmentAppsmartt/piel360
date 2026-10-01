import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  type KeyboardEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from 'react-native';

type KeyboardAwareScrollViewProps = ScrollViewProps & {
  /** Espacio libre entre el campo enfocado y el borde superior del teclado. */
  keyboardMargin?: number;
};

type Measurable = {
  measureInWindow?: (
    cb: (x: number, y: number, width: number, height: number) => void,
  ) => void;
};

const SHOW_EVENT = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const HIDE_EVENT = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

/**
 * ScrollView que deja espacio para el teclado y desplaza el campo enfocado
 * hasta que quede visible. Con edge-to-edge (Android) la ventana no se
 * redimensiona, así que `softwareKeyboardLayoutMode: 'resize'` no basta.
 */
export const KeyboardAwareScrollView = forwardRef<
  ScrollView,
  KeyboardAwareScrollViewProps
>(function KeyboardAwareScrollView(
  {
    keyboardMargin = 24,
    contentContainerStyle,
    onScroll,
    onContentSizeChange,
    onTouchEnd,
    scrollEventThrottle,
    keyboardShouldPersistTaps,
    children,
    ...rest
  },
  ref,
) {
  const scrollRef = useRef<ScrollView>(null);
  const offsetRef = useRef(0);
  const keyboardTopRef = useRef<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useImperativeHandle(ref, () => scrollRef.current as ScrollView);

  const ensureFocusedVisible = useCallback(() => {
    const keyboardTop = keyboardTopRef.current;
    if (keyboardTop == null) return;
    const input = TextInput.State.currentlyFocusedInput() as Measurable | null;
    if (!input?.measureInWindow) return;
    input.measureInWindow((_x, y, _w, height) => {
      const overlap = y + height + keyboardMargin - keyboardTop;
      if (overlap <= 0) return;
      scrollRef.current?.scrollTo({
        y: offsetRef.current + overlap,
        animated: true,
      });
    });
  }, [keyboardMargin]);

  useEffect(() => {
    const show = Keyboard.addListener(SHOW_EVENT, (event: KeyboardEvent) => {
      keyboardTopRef.current = event.endCoordinates.screenY;
      setKeyboardHeight(event.endCoordinates.height);
      // Esperar a que se aplique el padding inferior antes de desplazar.
      setTimeout(ensureFocusedVisible, 60);
    });
    const hide = Keyboard.addListener(HIDE_EVENT, () => {
      keyboardTopRef.current = null;
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [ensureFocusedVisible]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      offsetRef.current = event.nativeEvent.contentOffset.y;
      onScroll?.(event);
    },
    [onScroll],
  );

  const flatContentStyle = StyleSheet.flatten(contentContainerStyle) ?? {};
  const basePaddingBottom =
    typeof flatContentStyle.paddingBottom === 'number'
      ? flatContentStyle.paddingBottom
      : typeof flatContentStyle.paddingVertical === 'number'
        ? flatContentStyle.paddingVertical
        : typeof flatContentStyle.padding === 'number'
          ? flatContentStyle.padding
          : 0;

  return (
    <ScrollView
      ref={scrollRef}
      {...rest}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps ?? 'handled'}
      scrollEventThrottle={scrollEventThrottle ?? 16}
      onScroll={handleScroll}
      onContentSizeChange={(w, h) => {
        onContentSizeChange?.(w, h);
        // Un campo multilínea que crece no debe quedar tapado al escribir.
        if (keyboardTopRef.current != null) ensureFocusedVisible();
      }}
      onTouchEnd={(event) => {
        onTouchEnd?.(event);
        // Cambio de campo con el teclado ya abierto (no emite otro "show").
        if (keyboardTopRef.current != null) setTimeout(ensureFocusedVisible, 250);
      }}
      contentContainerStyle={[
        contentContainerStyle,
        keyboardHeight > 0
          ? { paddingBottom: basePaddingBottom + keyboardHeight }
          : null,
      ]}
    >
      {children}
    </ScrollView>
  );
});
