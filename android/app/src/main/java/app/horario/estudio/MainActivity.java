package app.horario.estudio;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        setTheme(R.style.AppTheme_NoActionBar);
        registerPlugin(AppHorarioHttpPlugin.class);
        registerPlugin(AppHorarioBackupPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
