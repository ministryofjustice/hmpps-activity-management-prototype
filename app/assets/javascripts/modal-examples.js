let toggler = "input[type='radio'][name='partial-pay-attendance']"
let target = $("input[type='radio'][name='partial-pay-radios']")

$(document).on('change', toggler, function(e){
	if($(toggler + ":checked").val() == 'yes'){
		target.parent().parent().hide()
	}
})