
// TOGGLING PASSWORD SHOW OR HIDE ON USER MANAGEMENT
$('.input-group .bx-hide, .input-group .bx-show').on('click', function() {
    const $input = $(this).closest('.input-group').find('input');

    if ($input.attr('type') === 'password') {
        $input.attr('type', 'text');
        $(this).removeClass('bx-hide').addClass('bx-show');
    } else {
        $input.attr('type', 'password');
        $(this).removeClass('bx-show').addClass('bx-hide');
    }
});