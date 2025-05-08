 $("#gform").submit((e)=>{
        e.preventDefault()
        $.ajax({
            url:"https://script.google.com/macros/s/AKfycbzfQHECqzgqxVHF8KCxlV19I1n31KY-eil33mjwvxfnZhYL_SPg1aKC_D2R6Rk0pNF7/exec",
            data:$("#gform").serialize(),
            method:"post",
            success:function (response){
                alert("Form submitted successfully")
                /window.location.reload()
                //window.location.href=" "
            },
            error:function (err){
                alert("Sorry,contact form under maintenance.Please contact through Instagram")

            }
        })
    })
