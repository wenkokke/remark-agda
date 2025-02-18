Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent lacus elit, viverra nec dolor eu, condimentum consectetur tellus. Aenean dictum dui a justo auctor bibendum. Sed eu libero vel est ultrices finibus. Nunc ut mollis orci. Duis vel dolor faucibus purus pellentesque rutrum. Proin ante justo, rutrum sed tortor a, venenatis molestie nisl. Sed at massa tincidunt, euismod orci at, varius justo. Praesent ut tempus justo, vel euismod mauris. Etiam lobortis consectetur nisl.

```agda
module input where
```

Nam id leo leo. In hac habitasse platea dictumst. Morbi lobortis nibh sit amet nisi placerat, nec cursus nisl consectetur. Vestibulum sagittis auctor est, et pulvinar erat rutrum sit amet. Aliquam nisl tellus, blandit a risus non, bibendum ullamcorper mi. Mauris mollis laoreet rutrum. Vestibulum imperdiet diam tincidunt, venenatis dui eget, tempor urna. Suspendisse a facilisis purus. Cras ornare neque sed lorem mollis, vestibulum sollicitudin tellus consequat. Quisque pretium sapien a laoreet efficitur. Fusce maximus urna facilisis libero blandit, mollis pulvinar lacus malesuada. Nulla justo tellus, varius ac tincidunt et, fermentum sed quam. Suspendisse porta urna velit, scelerisque rutrum odio fermentum ac.

```agda
open import Agda.Builtin.Nat
```

In quam nisi, rutrum vitae urna sed, finibus euismod nunc. Mauris elit ipsum, volutpat a fringilla id, egestas posuere elit. Nullam ut justo eros. Morbi vitae augue accumsan libero volutpat porta. Fusce convallis vitae lectus ac consectetur. Integer posuere lorem id libero gravida, non tempus enim dignissim. Pellentesque sodales vitae sapien sed varius. Vivamus semper mattis finibus. Morbi sit amet diam sit amet dui finibus tristique nec ac enim. Etiam eu nisi enim.

```agda
-- What's this then? The Ackermann function?
ack : Nat -> Nat -> Nat
ack  zero        n  = suc n
ack (suc m)  zero   = ack m 1
ack (suc m) (suc n) = ack m (ack (suc m) n)
```

Praesent sem ex, condimentum in congue non, vulputate sed dolor. Mauris ac finibus libero. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Maecenas lobortis in quam rutrum ornare. Nulla feugiat eu dolor a gravida. Proin commodo enim vitae tortor vestibulum pellentesque. Phasellus posuere quam neque, vitae fermentum nibh vestibulum nec. Aenean in elementum diam, et aliquet elit.
